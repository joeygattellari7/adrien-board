import { DateRange, AdAccountSummary } from "../types";
import { MockAdsProvider } from "./mock";

const GRAPH_VERSION = "v21.0";
const DEFAULT_AD_ACCOUNT_ID = "937731679434253"; // Juliano Pizzaria

type GraphInsightRow = {
  spend?: string;
  impressions?: string;
  clicks?: string;
  ctr?: string;
  cpc?: string;
  reach?: string;
  // Present only once conversion tracking (pixel/CAPI events) is configured
  // on the ad account — currently absent for Juliano Pizzaria.
  omni_purchase?: { value: string }[];
  omni_purchase_values?: { value: string }[];
};

function num(v: string | undefined): number {
  if (!v) return 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

async function fetchInsights(
  accountId: string,
  token: string,
  range: DateRange
): Promise<{ row: GraphInsightRow | null; error?: string }> {
  const fields = ["spend", "impressions", "clicks", "ctr", "cpc", "reach", "omni_purchase", "omni_purchase_values"];
  const timeRange = JSON.stringify({ since: range.start, until: range.end });
  const url = new URL(`https://graph.facebook.com/${GRAPH_VERSION}/act_${accountId}/insights`);
  url.searchParams.set("fields", fields.join(","));
  url.searchParams.set("time_range", timeRange);
  url.searchParams.set("access_token", token);

  let res: Response;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    try {
      res = await fetch(url.toString(), { next: { revalidate: 0 }, signal: controller.signal });
    } finally {
      clearTimeout(timeout);
    }
  } catch (e) {
    const timedOut = e instanceof Error && e.name === "AbortError";
    const message = timedOut ? "request timed out after 8s" : e instanceof Error ? e.message : String(e);
    console.error("Meta Graph API network error", message);
    return { row: null, error: `network error: ${message}` };
  }

  if (!res.ok) {
    const body = await res.text();
    console.error("Meta Graph API error", res.status, body);
    return { row: null, error: `HTTP ${res.status}: ${body.slice(0, 300)}` };
  }
  const json = await res.json();
  const row = json.data?.[0] ?? null;
  if (!row) return { row: null, error: "Graph API returned no data rows for this account/range" };
  return { row };
}

/**
 * Real Meta (Facebook/Instagram) ads provider backed by the Graph API
 * Marketing Insights endpoint. Requires META_ACCESS_TOKEN (and optionally
 * META_AD_ACCOUNT_ID) as env vars — falls back to mock data when the token
 * is not configured, so the dashboard never breaks in an unconfigured
 * environment.
 */
export class MetaAdsProvider {
  private mockFallback = new MockAdsProvider();

  async getSummary(range: DateRange): Promise<AdAccountSummary> {
    const token = process.env.META_ACCESS_TOKEN;
    const accountId = process.env.META_AD_ACCOUNT_ID || DEFAULT_AD_ACCOUNT_ID;

    if (!token) {
      const fallback = await this.mockFallback.getSummary("meta", range);
      return { ...fallback, fallbackReason: "META_ACCESS_TOKEN is not set in this environment" };
    }

    const { row, error } = await fetchInsights(accountId, token, range);
    if (!row) {
      const fallback = await this.mockFallback.getSummary("meta", range);
      return { ...fallback, fallbackReason: error ?? "unknown error calling Meta Graph API" };
    }

    const spend = num(row.spend);
    const impressions = num(row.impressions);
    const clicks = num(row.clicks);
    const reach = num(row.reach);

    const conversions = row.omni_purchase?.reduce((sum, a) => sum + num(a.value), 0) ?? 0;
    const revenue = row.omni_purchase_values?.reduce((sum, a) => sum + num(a.value), 0) ?? 0;
    const conversionTrackingAvailable = Boolean(row.omni_purchase && row.omni_purchase.length > 0);

    return {
      platform: "meta",
      source: "live",
      spend: Math.round(spend * 100) / 100,
      impressions,
      clicks,
      reach,
      conversions,
      revenue: Math.round(revenue * 100) / 100,
      roas: spend > 0 ? Math.round((revenue / spend) * 100) / 100 : 0,
      ctr: impressions > 0 ? Math.round((clicks / impressions) * 10000) / 100 : num(row.ctr),
      cpc: clicks > 0 ? Math.round((spend / clicks) * 100) / 100 : num(row.cpc),
      cpa: conversions > 0 ? Math.round((spend / conversions) * 100) / 100 : 0,
      conversionTrackingAvailable,
      series: [],
    };
  }
}

export const metaAdsProvider = new MetaAdsProvider();
