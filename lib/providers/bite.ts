import { dateList } from "../dateRange";
import { BusinessSummary, DateRange } from "../types";
import { MockBusinessProvider } from "./mock";

const API_VERSION_HEADER = "4";

type BiteOrder = {
  isCancelled: boolean;
  total: number; // cents, includes tip
  refundedAmount: number; // cents
  guest: { guestId: string };
  loyaltyIds: unknown[];
  items: { name: string; price: number; quantity: number }[];
};

type BiteDayResponse = {
  success: boolean;
  data: { orders: BiteOrder[]; next?: string };
};

async function withTimeout<T>(fn: (signal: AbortSignal) => Promise<T>, ms: number): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ms);
  try {
    return await fn(controller.signal);
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchOrdersForDay(
  baseUrl: string,
  token: string,
  locationId: string,
  date: string
): Promise<{ orders: BiteOrder[] | null; error?: string }> {
  const orders: BiteOrder[] = [];
  let path = `/v2/reporting/orders/day/${date}`;

  // Bite paginates within a single day via a `next` path — follow it until absent.
  // Rate limit is 75 req/10min per location, so this comfortably supports a
  // multi-week range (one or a few requests per day).
  for (let page = 0; page < 20; page++) {
    let res: Response;
    try {
      res = await withTimeout(
        (signal) =>
          fetch(`${baseUrl}${path}`, {
            headers: {
              Authorization: `Bearer ${token}`,
              "x-bite-location-id": locationId,
              "x-md-api-version": API_VERSION_HEADER,
              Accept: "application/json",
            },
            signal,
          }),
        8000
      );
    } catch (e) {
      const timedOut = e instanceof Error && e.name === "AbortError";
      const message = timedOut ? "request timed out after 8s" : e instanceof Error ? e.message : String(e);
      return { orders: null, error: `network error on ${date}: ${message}` };
    }

    if (!res.ok) {
      const body = await res.text();
      return { orders: null, error: `HTTP ${res.status} on ${date}: ${body.slice(0, 300)}` };
    }

    const json: BiteDayResponse = await res.json();
    if (!json.success) return { orders: null, error: `Bite API returned success=false for ${date}` };

    orders.push(...json.data.orders);
    if (!json.data.next) break;
    path = json.data.next.replace(/^\/api/, ""); // `next` includes a leading /api prefix
  }

  return { orders };
}

/**
 * Real Bite Business provider, backed by Bite's Reporting v2 API
 * (GET /v2/reporting/orders/day/{date}). Requires BITE_API_BASE_URL,
 * BITE_API_TOKEN (with the "Reporting" scope), and BITE_LOCATION_ID as env
 * vars. Falls back to mock data with a fallbackReason whenever anything is
 * missing or fails, so the dashboard never breaks in an unconfigured
 * environment.
 *
 * The API only returns one day at a time, so a date range means one request
 * per day (plus pagination within a day for busy locations).
 */
export class BiteBusinessProvider {
  private mockFallback = new MockBusinessProvider();

  async getSummary(range: DateRange): Promise<BusinessSummary> {
    const baseUrl = process.env.BITE_API_BASE_URL;
    const token = process.env.BITE_API_TOKEN;
    const locationId = process.env.BITE_LOCATION_ID;

    const missing = [
      !baseUrl && "BITE_API_BASE_URL",
      !token && "BITE_API_TOKEN",
      !locationId && "BITE_LOCATION_ID",
    ].filter(Boolean);

    if (missing.length > 0) {
      const fallback = await this.mockFallback.getSummary(range);
      return { ...fallback, fallbackReason: `Missing env vars: ${missing.join(", ")}` };
    }

    const dates = dateList(range);
    const allOrders: BiteOrder[] = [];
    for (const date of dates) {
      const { orders, error } = await fetchOrdersForDay(baseUrl!, token!, locationId!, date);
      if (!orders) {
        const fallback = await this.mockFallback.getSummary(range);
        return { ...fallback, fallbackReason: error ?? "unknown error calling Bite API" };
      }
      allOrders.push(...orders);
    }

    const validOrders = allOrders.filter((o) => !o.isCancelled);
    const totalSales = validOrders.reduce((sum, o) => sum + (o.total - o.refundedAmount), 0) / 100;
    const totalOrders = validOrders.length;
    const avgOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;

    // Guest frequency within the selected range only — Bite's daily order
    // report has no all-time customer history, so "new" vs "returning" here
    // is approximated from repeat orders inside this window, not lifetime.
    const ordersByGuest = new Map<string, number>();
    for (const o of validOrders) {
      ordersByGuest.set(o.guest.guestId, (ordersByGuest.get(o.guest.guestId) ?? 0) + 1);
    }
    const uniqueGuests = ordersByGuest.size;
    const returningGuests = [...ordersByGuest.values()].filter((n) => n > 1).length;
    const newMembers = uniqueGuests - returningGuests;
    const returningMemberRate = uniqueGuests > 0 ? Math.round((returningGuests / uniqueGuests) * 1000) / 10 : 0;
    const rangeDays = dates.length;
    const orderFrequencyDays = uniqueGuests > 0 ? Math.round((rangeDays / (totalOrders / uniqueGuests)) * 10) / 10 : 0;

    const itemTotals = new Map<string, { orders: number; revenue: number }>();
    for (const o of validOrders) {
      for (const item of o.items) {
        const entry = itemTotals.get(item.name) ?? { orders: 0, revenue: 0 };
        entry.orders += item.quantity;
        entry.revenue += (item.price * item.quantity) / 100;
        itemTotals.set(item.name, entry);
      }
    }
    const topItems = [...itemTotals.entries()]
      .map(([name, v]) => ({ name, orders: Math.round(v.orders), revenue: Math.round(v.revenue) }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 4);

    return {
      source: "live",
      totalSales: Math.round(totalSales * 100) / 100,
      totalOrders,
      avgOrderValue: Math.round(avgOrderValue * 100) / 100,
      newMembers,
      returningMemberRate,
      orderFrequencyDays,
      topItems,
      series: [],
    };
  }
}

export const biteBusinessProvider = new BiteBusinessProvider();
