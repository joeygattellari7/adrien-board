import { DateRange, AdAccountSummary } from "../types";
import { MockAdsProvider } from "./mock";

const API_VERSION = "v18";

type GoogleAdsRow = {
  metrics?: {
    costMicros?: string;
    impressions?: string;
    clicks?: string;
    conversions?: number;
    conversionsValue?: number;
  };
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

async function getAccessToken(
  clientId: string,
  clientSecret: string,
  refreshToken: string
): Promise<{ token: string | null; error?: string }> {
  try {
    const res = await withTimeout(
      (signal) =>
        fetch("https://oauth2.googleapis.com/token", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            client_id: clientId,
            client_secret: clientSecret,
            refresh_token: refreshToken,
            grant_type: "refresh_token",
          }),
          signal,
        }),
      8000
    );
    if (!res.ok) {
      const body = await res.text();
      return { token: null, error: `OAuth token refresh failed: HTTP ${res.status}: ${body.slice(0, 300)}` };
    }
    const json = await res.json();
    return { token: json.access_token ?? null, error: json.access_token ? undefined : "no access_token in OAuth response" };
  } catch (e) {
    const timedOut = e instanceof Error && e.name === "AbortError";
    const message = timedOut ? "OAuth token request timed out after 8s" : e instanceof Error ? e.message : String(e);
    return { token: null, error: `OAuth network error: ${message}` };
  }
}

async function fetchMetrics(
  customerId: string,
  loginCustomerId: string | undefined,
  developerToken: string | undefined,
  accessToken: string,
  range: DateRange
): Promise<{ row: GoogleAdsRow | null; error?: string }> {
  const query = `
    SELECT metrics.cost_micros, metrics.impressions, metrics.clicks, metrics.conversions, metrics.conversions_value
    FROM customer
    WHERE segments.date BETWEEN '${range.start}' AND '${range.end}'
  `;

  // As of the September 2026 Google Ads API change, access level is tied to
  // the Cloud project behind the OAuth client, not a developer token — the
  // header is optional and ignored by the API, kept here only for
  // backward-compatible logging on Google's end if one is configured.
  const headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  };
  if (developerToken) headers["developer-token"] = developerToken;
  if (loginCustomerId) headers["login-customer-id"] = loginCustomerId.replace(/-/g, "");

  try {
    const res = await withTimeout(
      (signal) =>
        fetch(
          `https://googleads.googleapis.com/${API_VERSION}/customers/${customerId.replace(/-/g, "")}/googleAds:search`,
          { method: "POST", headers, body: JSON.stringify({ query }), signal }
        ),
      8000
    );
    if (!res.ok) {
      const body = await res.text();
      return { row: null, error: `HTTP ${res.status}: ${body.slice(0, 300)}` };
    }
    const json = await res.json();
    const rows: GoogleAdsRow[] = json.results ?? [];
    if (rows.length === 0) return { row: null, error: "Google Ads API returned no rows for this account/range" };

    // Sum metrics across all returned rows (one per day-ish grouping, since no explicit grouping was requested).
    const merged: GoogleAdsRow = { metrics: { costMicros: "0", impressions: "0", clicks: "0", conversions: 0, conversionsValue: 0 } };
    for (const r of rows) {
      merged.metrics!.costMicros = String(Number(merged.metrics!.costMicros) + Number(r.metrics?.costMicros ?? 0));
      merged.metrics!.impressions = String(Number(merged.metrics!.impressions) + Number(r.metrics?.impressions ?? 0));
      merged.metrics!.clicks = String(Number(merged.metrics!.clicks) + Number(r.metrics?.clicks ?? 0));
      merged.metrics!.conversions = (merged.metrics!.conversions ?? 0) + (r.metrics?.conversions ?? 0);
      merged.metrics!.conversionsValue = (merged.metrics!.conversionsValue ?? 0) + (r.metrics?.conversionsValue ?? 0);
    }
    return { row: merged };
  } catch (e) {
    const timedOut = e instanceof Error && e.name === "AbortError";
    const message = timedOut ? "request timed out after 8s" : e instanceof Error ? e.message : String(e);
    return { row: null, error: `network error: ${message}` };
  }
}

/**
 * Real Google Ads provider backed by the Google Ads API (GAQL search).
 *
 * As of the September 2026 Google Ads API change, access level is
 * determined by the Cloud project behind the OAuth client, not by a
 * developer token — so GOOGLE_ADS_DEVELOPER_TOKEN is optional here.
 *
 * Requires GOOGLE_ADS_CLIENT_ID, GOOGLE_ADS_CLIENT_SECRET,
 * GOOGLE_ADS_REFRESH_TOKEN, and GOOGLE_ADS_CUSTOMER_ID (optionally
 * GOOGLE_ADS_LOGIN_CUSTOMER_ID if the account sits under a manager/MCC
 * account) as env vars. Falls back to mock data with a fallbackReason
 * whenever anything is missing or fails, so the dashboard never breaks in
 * an unconfigured environment.
 */
export class GoogleAdsProvider {
  private mockFallback = new MockAdsProvider();

  async getSummary(range: DateRange): Promise<AdAccountSummary> {
    const developerToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN;
    const clientId = process.env.GOOGLE_ADS_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_ADS_CLIENT_SECRET;
    const refreshToken = process.env.GOOGLE_ADS_REFRESH_TOKEN;
    const customerId = process.env.GOOGLE_ADS_CUSTOMER_ID;
    const loginCustomerId = process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID;

    const missing = [
      !clientId && "GOOGLE_ADS_CLIENT_ID",
      !clientSecret && "GOOGLE_ADS_CLIENT_SECRET",
      !refreshToken && "GOOGLE_ADS_REFRESH_TOKEN",
      !customerId && "GOOGLE_ADS_CUSTOMER_ID",
    ].filter(Boolean);

    if (missing.length > 0) {
      const fallback = await this.mockFallback.getSummary("google", range);
      return { ...fallback, fallbackReason: `Missing env vars: ${missing.join(", ")}` };
    }

    const { token: accessToken, error: tokenError } = await getAccessToken(clientId!, clientSecret!, refreshToken!);
    if (!accessToken) {
      const fallback = await this.mockFallback.getSummary("google", range);
      return { ...fallback, fallbackReason: tokenError ?? "failed to get Google OAuth access token" };
    }

    const { row, error } = await fetchMetrics(customerId!, loginCustomerId, developerToken, accessToken, range);
    if (!row) {
      const fallback = await this.mockFallback.getSummary("google", range);
      return { ...fallback, fallbackReason: error ?? "unknown error calling Google Ads API" };
    }

    const spend = Number(row.metrics?.costMicros ?? 0) / 1_000_000;
    const impressions = Number(row.metrics?.impressions ?? 0);
    const clicks = Number(row.metrics?.clicks ?? 0);
    const conversions = row.metrics?.conversions ?? 0;
    const revenue = row.metrics?.conversionsValue ?? 0;

    return {
      platform: "google",
      source: "live",
      spend: Math.round(spend * 100) / 100,
      impressions,
      clicks,
      reach: 0, // Google Ads doesn't report a directly comparable "reach" metric at this query level
      conversions: Math.round(conversions),
      revenue: Math.round(revenue * 100) / 100,
      roas: spend > 0 ? Math.round((revenue / spend) * 100) / 100 : 0,
      ctr: impressions > 0 ? Math.round((clicks / impressions) * 10000) / 100 : 0,
      cpc: clicks > 0 ? Math.round((spend / clicks) * 100) / 100 : 0,
      cpa: conversions > 0 ? Math.round((spend / conversions) * 100) / 100 : 0,
      conversionTrackingAvailable: conversions > 0,
      series: [],
    };
  }
}

export const googleAdsProvider = new GoogleAdsProvider();
