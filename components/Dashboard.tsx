"use client";

import { useEffect, useState } from "react";
import StatCard from "./StatCard";
import InsightsPanel from "./InsightsPanel";
import DateRangePicker from "./DateRangePicker";
import { presetRange } from "@/lib/dateRange";
import { AdAccountSummary, BusinessSummary, DateRange, Insight, SocialAccountSummary } from "@/lib/types";

const AD_METRIC_OPTIONS = [
  { key: "spend", label: "Spend" },
  { key: "impressions", label: "Impressions" },
  { key: "clicks", label: "Clicks" },
  { key: "conversions", label: "Conversions" },
  { key: "revenue", label: "Revenue" },
  { key: "roas", label: "ROAS" },
  { key: "ctr", label: "CTR" },
  { key: "cpc", label: "CPC" },
  { key: "cpa", label: "CPA" },
] as const;

function useSectionData<T>(endpoint: string, range: DateRange) {
  const [data, setData] = useState<T | null>(null);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ start: range.start, end: range.end, label: range.label });
    fetch(`${endpoint}?${params.toString()}`)
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setInsights(d.insights ?? []);
      })
      .finally(() => setLoading(false));
  }, [endpoint, range.start, range.end, range.label]);

  return { data, insights, loading };
}

export default function Dashboard() {
  const [businessRange, setBusinessRange] = useState<DateRange>(() => presetRange(30));
  const [adsRange, setAdsRange] = useState<DateRange>(() => presetRange(30));
  const [socialRange, setSocialRange] = useState<DateRange>(() => presetRange(30));

  const [visibleMetrics, setVisibleMetrics] = useState<Set<string>>(
    new Set(["spend", "revenue", "roas", "conversions"])
  );

  const business = useSectionData<{ business: BusinessSummary }>("/api/business", businessRange);
  const ads = useSectionData<{ ads: AdAccountSummary[] }>("/api/ads", adsRange);
  const social = useSectionData<{ social: SocialAccountSummary[] }>("/api/social", socialRange);

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
      <header className="mb-8">
        <h1 className="text-2xl font-bold">Adrien — Juliano Pizzaria</h1>
        <p className="text-sm text-black/50 dark:text-white/50">Real-time performance dashboard</p>
      </header>

      {/* Business section */}
      <section className="mb-10">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <h2 className="text-lg font-semibold">Business Data (Bite Business)</h2>
          <DateRangePicker value={businessRange} onChange={setBusinessRange} />
        </div>
        {business.loading && <div className="text-sm text-black/50">Loading…</div>}
        {business.data && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatCard label="Total sales" value={business.data.business.totalSales} unit="currency" />
              <StatCard label="Total orders" value={business.data.business.totalOrders} unit="number" />
              <StatCard label="Avg order value" value={business.data.business.avgOrderValue} unit="currency" />
              <StatCard label="New members" value={business.data.business.newMembers} unit="number" />
            </div>
            <InsightsPanel insights={business.insights} title="Business insights" />
          </>
        )}
      </section>

      {/* Performance section */}
      <section className="mb-10">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <h2 className="text-lg font-semibold">Ad Performance (Google + Meta)</h2>
          <DateRangePicker value={adsRange} onChange={setAdsRange} />
        </div>
        <div className="flex flex-wrap gap-2 mb-4">
          {AD_METRIC_OPTIONS.map((m) => (
            <button
              key={m.key}
              onClick={() => toggleMetric(m.key)}
              className={`text-xs px-2.5 py-1 rounded-full border transition ${
                visibleMetrics.has(m.key)
                  ? "bg-blue-600 text-white border-blue-600"
                  : "border-black/15 dark:border-white/15 text-black/60 dark:text-white/60"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
        {ads.loading && <div className="text-sm text-black/50">Loading…</div>}
        {ads.data?.ads.map((ad) => (
          <div key={ad.platform} className="mb-6">
            <h3 className="text-sm font-medium mb-2 capitalize">{ad.platform} Ads</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {visibleMetrics.has("spend") && <StatCard label="Spend" value={ad.spend} unit="currency" />}
              {visibleMetrics.has("impressions") && (
                <StatCard label="Impressions" value={ad.impressions} unit="number" />
              )}
              {visibleMetrics.has("clicks") && <StatCard label="Clicks" value={ad.clicks} unit="number" />}
              {visibleMetrics.has("conversions") && (
                <StatCard label="Conversions" value={ad.conversions} unit="number" />
              )}
              {visibleMetrics.has("revenue") && <StatCard label="Revenue" value={ad.revenue} unit="currency" />}
              {visibleMetrics.has("roas") && <StatCard label="ROAS" value={ad.roas} unit="number" />}
              {visibleMetrics.has("ctr") && <StatCard label="CTR" value={ad.ctr} unit="percent" />}
              {visibleMetrics.has("cpc") && <StatCard label="CPC" value={ad.cpc} unit="currency" />}
              {visibleMetrics.has("cpa") && <StatCard label="CPA" value={ad.cpa} unit="currency" />}
            </div>
          </div>
        ))}
        <InsightsPanel insights={ads.insights} title="Performance insights & ideas" />
      </section>

      {/* Social section */}
      <section className="mb-10">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <h2 className="text-lg font-semibold">Social Media Review</h2>
          <DateRangePicker value={socialRange} onChange={setSocialRange} />
        </div>
        {social.loading && <div className="text-sm text-black/50">Loading…</div>}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {social.data?.social.map((s) => (
            <div key={s.platform} className="rounded-xl border border-black/10 dark:border-white/10 p-4">
              <h3 className="text-sm font-medium mb-2 capitalize">{s.platform}</h3>
              <div className="grid grid-cols-3 gap-2">
                <StatCard label="Followers" value={s.followers} unit="number" change={s.followerChange} />
                <StatCard label="Impressions" value={s.impressions} unit="number" />
                <StatCard label="Engagement" value={s.engagementRate} unit="percent" />
              </div>
            </div>
          ))}
        </div>
        <InsightsPanel insights={social.insights} title="Social insights & ideas" />
      </section>
    </div>
  );
}
