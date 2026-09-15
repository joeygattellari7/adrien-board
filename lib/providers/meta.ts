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

async function fetchInsights(accountId: string, token: string, range: DateRange): Promise<GraphInsightRow | null> {
  const fields = ["spend", "impressions", "clicks", "ctr", "cpc", "reach", "omni_purchase", "omni_purchase_values"];
  const timeRange = JSON.stringify({ since: range.start, until: range.end });
  const url = new URL(`https://graph.facebook.com/${GRAPH_VERSION}/act_${accountId}/insights`);
  url.searchParams.set("fields", fields.join(","));
  url.searchParams.set("time_range", timeRange);
  url.searchParams.set("access_token", token);

  const res = await fetch(url.toString(), { next: { revalidate: 0 } });
  if (!res.ok) {
    console.error("Meta Graph API error", res.status, await res.text());
    return null;
  }
  const json = await res.json();
  return json.data?.[0] ?? null;
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
      return this.mockFallback.getSummary("meta", range);
    }

    const row = await fetchInsights(accountId, token, range);
    if (!row) {
      return this.mockFallback.getSummary("meta", range);
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
