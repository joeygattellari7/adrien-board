"use client";

import { useEffect, useState } from "react";
import StatCard from "./StatCard";
import InsightsPanel from "./InsightsPanel";
import DateRangePicker from "./DateRangePicker";
import CompareToSelect from "./CompareToSelect";
import MetricSelect from "./MetricSelect";
import { CompareOption, presetRange } from "@/lib/dateRange";
import { AdAccountSummary, BusinessSummary, DateRange, Insight, SocialAccountSummary } from "@/lib/types";

const AD_METRIC_OPTIONS = [
  { key: "spend", label: "Spend" },
  { key: "impressions", label: "Impressions" },
  { key: "clicks", label: "Clicks" },
  { key: "reach", label: "Reach" },
  { key: "conversions", label: "Conversions" },
  { key: "roas", label: "ROAS" },
  { key: "ctr", label: "CTR" },
  { key: "cpc", label: "CPC" },
  { key: "cpa", label: "CPA" },
] as const;

type BusinessCompare = { label: string; totalSales: number; totalOrders: number; avgOrderValue: number; newMembers: number };
type PlatformCompare = { label: string; byPlatform: Record<string, Record<string, number>> };

function useSectionData<T>(endpoint: string, range: DateRange, compare: CompareOption) {
  const [data, setData] = useState<T | null>(null);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ start: range.start, end: range.end, label: range.label, compare });
    fetch(`${endpoint}?${params.toString()}`)
      .then((r) => r.json())
      .then((d: T & { insights?: Insight[] }) => {
        setData(d);
        setInsights(d.insights ?? []);
      })
      .finally(() => setLoading(false));
  }, [endpoint, range.start, range.end, range.label, compare]);

  return { data, insights, loading };
}

export default function Dashboard() {
  const [businessRange, setBusinessRange] = useState<DateRange>(() => presetRange(30));
  const [adsRange, setAdsRange] = useState<DateRange>(() => presetRange(30));
  const [socialRange, setSocialRange] = useState<DateRange>(() => presetRange(30));

  const [businessCompare, setBusinessCompare] = useState<CompareOption>("none");
  const [adsCompare, setAdsCompare] = useState<CompareOption>("none");
  const [socialCompare, setSocialCompare] = useState<CompareOption>("none");

  const [visibleMetrics, setVisibleMetrics] = useState<Set<string>>(
    new Set(["spend", "roas", "conversions"])
  );

  const business = useSectionData<{ business: BusinessSummary; compare: BusinessCompare | null }>(
    "/api/business",
    businessRange,
    businessCompare
  );
  const ads = useSectionData<{ ads: AdAccountSummary[]; compare: PlatformCompare | null }>(
    "/api/ads",
    adsRange,
    adsCompare
  );
  const social = useSectionData<{ social: SocialAccountSummary[]; compare: PlatformCompare | null }>(
    "/api/social",
    socialRange,
    socialCompare
  );

  function toggleMetric(key: string) {
    setVisibleMetrics((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="relative mb-8 rounded-2xl bg-zinc-200 dark:bg-zinc-800 px-6 py-8">
        {/* TODO: swap for the actual G8 Media logo image once provided */}
        <div className="absolute top-4 right-6 text-sm font-semibold text-black/40 dark:text-white/40">
          G8 Media
        </div>
        <h1 className="text-center text-4xl font-extrabold tracking-tight text-black dark:text-white">ADRIEN</h1>
      </div>
      <header className="mb-8">
        <p className="text-sm font-medium">Client: Juliano Pizzaria</p>
        <p className="text-sm text-black/50 dark:text-white/50">Real-time performance dashboard</p>
      </header>

      {/* Business section */}
      <section className="mb-10 rounded-2xl border-2 border-emerald-500/25 dark:border-emerald-400/25 bg-emerald-50/40 dark:bg-emerald-950/15 p-5 md:p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
            <h2 className="text-xl font-bold tracking-tight">Business Data</h2>
            <span className="text-sm font-normal text-black/40 dark:text-white/40">Bite Business</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <CompareToSelect value={businessCompare} onChange={setBusinessCompare} />
            <DateRangePicker value={businessRange} onChange={setBusinessRange} />
          </div>
        </div>
        {business.loading && <div className="text-sm text-black/50">Loading…</div>}
        {business.data && (
          <div className="rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-900 p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatCard
                label="Total sales"
                value={business.data.business.totalSales}
                unit="currency"
                change={business.data.compare?.totalSales}
              />
              <StatCard
                label="Total orders"
                value={business.data.business.totalOrders}
                unit="number"
                change={business.data.compare?.totalOrders}
              />
              <StatCard
                label="Avg order value"
                value={business.data.business.avgOrderValue}
                unit="currency"
                change={business.data.compare?.avgOrderValue}
              />
              <StatCard
                label="New members"
                value={business.data.business.newMembers}
                unit="number"
                change={business.data.compare?.newMembers}
              />
            </div>
            <InsightsPanel insights={business.insights} title="Business insights" />
          </div>
        )}
      </section>

      {/* Performance section — visually distinct container since this is the
          highest-traffic section of the dashboard */}
      <section className="mb-10 rounded-2xl border-2 border-indigo-500/25 dark:border-indigo-400/25 bg-indigo-50/40 dark:bg-indigo-950/15 p-5 md:p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-indigo-500" />
            <h2 className="text-xl font-bold tracking-tight">Ad Performance</h2>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <MetricSelect options={AD_METRIC_OPTIONS} selected={visibleMetrics} onToggle={toggleMetric} />
            <CompareToSelect value={adsCompare} onChange={setAdsCompare} />
            <DateRangePicker value={adsRange} onChange={setAdsRange} />
          </div>
        </div>
        {ads.loading && <div className="text-sm text-black/50">Loading…</div>}
        <div className="flex flex-col gap-5">
          {ads.data?.ads.map((ad) => {
            const platformCompare = ads.data?.compare?.byPlatform[ad.platform];
            const untracked = !ad.conversionTrackingAvailable;
            const platformInsights = ads.insights.filter((i) => i.platform === ad.platform);
            const accent = ad.platform === "meta" ? "border-blue-500/40" : "border-amber-500/40";
            return (
              <div
                key={ad.platform}
                className={`rounded-xl border-l-4 ${accent} border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-900 p-4`}
              >
                <div className="flex items-center gap-2 mb-3">
                  <h3 className="text-base font-semibold capitalize">{ad.platform} Ads</h3>
                  <span
                    title={ad.fallbackReason}
                    className={`text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded ${
                      ad.source === "live"
                        ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                        : "bg-black/10 dark:bg-white/10 text-black/50 dark:text-white/50"
                    }`}
                  >
                    {ad.source === "live" ? "Live data" : "Mock data"}
                  </span>
                </div>
                {ad.fallbackReason && (
                  <div className="text-xs text-amber-600 dark:text-amber-400 mb-3">{ad.fallbackReason}</div>
                )}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {visibleMetrics.has("spend") && (
                    <StatCard label="Spend" value={ad.spend} unit="currency" change={platformCompare?.spend} />
                  )}
                  {visibleMetrics.has("impressions") && (
                    <StatCard
                      label="Impressions"
                      value={ad.impressions}
                      unit="number"
                      change={platformCompare?.impressions}
                    />
                  )}
                  {visibleMetrics.has("clicks") && (
                    <StatCard label="Clicks" value={ad.clicks} unit="number" change={platformCompare?.clicks} />
                  )}
                  {visibleMetrics.has("reach") && (
                    <StatCard label="Reach" value={ad.reach} unit="number" change={platformCompare?.reach} />
                  )}
                  {visibleMetrics.has("conversions") && (
                    <StatCard
                      label="Conversions"
                      value={ad.conversions}
                      unit="number"
                      change={platformCompare?.conversions}
                      unavailable={untracked}
                    />
                  )}
                  {visibleMetrics.has("roas") && (
                    <StatCard
                      label="ROAS"
                      value={ad.roas}
                      unit="number"
                      change={platformCompare?.roas}
                      unavailable={untracked}
                    />
                  )}
                  {visibleMetrics.has("ctr") && (
                    <StatCard label="CTR" value={ad.ctr} unit="percent" change={platformCompare?.ctr} />
                  )}
                  {visibleMetrics.has("cpc") && (
                    <StatCard label="CPC" value={ad.cpc} unit="currency" change={platformCompare?.cpc} />
                  )}
                  {visibleMetrics.has("cpa") && (
                    <StatCard
                      label="CPA"
                      value={ad.cpa}
                      unit="currency"
                      change={platformCompare?.cpa}
                      unavailable={untracked}
                    />
                  )}
                </div>
                <InsightsPanel insights={platformInsights} title={`${ad.platform === "meta" ? "Meta" : "Google"} insights & ideas`} />
              </div>
            );
          })}
        </div>
      </section>

      {/* Social section */}
      <section className="mb-10">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <h2 className="text-lg font-semibold">Social Media Review</h2>
          <div className="flex flex-wrap items-center gap-2">
            <CompareToSelect value={socialCompare} onChange={setSocialCompare} />
            <DateRangePicker value={socialRange} onChange={setSocialRange} />
          </div>
        </div>
        {social.loading && <div className="text-sm text-black/50">Loading…</div>}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {social.data?.social.map((s) => {
            const platformCompare = social.data?.compare?.byPlatform[s.platform];
            return (
              <div key={s.platform} className="rounded-xl border border-black/10 dark:border-white/10 p-4">
                <h3 className="text-sm font-medium mb-2 capitalize">{s.platform}</h3>
                <div className="grid grid-cols-3 gap-2">
                  <StatCard
                    label="Followers"
                    value={s.followers}
                    unit="number"
                    change={platformCompare?.followers ?? s.followerChange}
                  />
                  <StatCard
                    label="Impressions"
                    value={s.impressions}
                    unit="number"
                    change={platformCompare?.impressions}
                  />
                  <StatCard
                    label="Engagement"
                    value={s.engagementRate}
                    unit="percent"
                    change={platformCompare?.engagementRate}
                  />
                </div>
              </div>
            );
          })}
        </div>
        <InsightsPanel insights={social.insights} title="Social insights & ideas" />
      </section>
    </div>
  );
}
