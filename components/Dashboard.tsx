"use client";

import { useEffect, useMemo, useState } from "react";
import StatCard from "./StatCard";
import InsightsPanel from "./InsightsPanel";
import { AdAccountSummary, BusinessSummary, Insight, SocialAccountSummary } from "@/lib/types";

const PRESETS = [7, 14, 30, 60, 90];

type DashboardData = {
  range: { label: string };
  ads: AdAccountSummary[];
  social: SocialAccountSummary[];
  business: BusinessSummary;
  insights: Insight[];
};

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

const MAX_DAYS = 365;

export default function Dashboard() {
  const [days, setDays] = useState(30);
  const [customInput, setCustomInput] = useState("30");
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [visibleMetrics, setVisibleMetrics] = useState<Set<string>>(
    new Set(["spend", "revenue", "roas", "conversions"])
  );

  function applyCustomDays(raw: string) {
    const n = Math.round(Number(raw));
    if (!Number.isFinite(n) || n < 1) return;
    setDays(Math.min(n, MAX_DAYS));
  }

  useEffect(() => {
    setCustomInput(String(days));
  }, [days]);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/dashboard?days=${days}`)
      .then((r) => r.json())
      .then((d) => setData(d))
      .finally(() => setLoading(false));
  }, [days]);

  const adInsights = useMemo(() => data?.insights.filter((i) => i.category === "performance") ?? [], [data]);
  const socialInsights = useMemo(() => data?.insights.filter((i) => i.category === "social") ?? [], [data]);
  const businessInsights = useMemo(() => data?.insights.filter((i) => i.category === "business") ?? [], [data]);

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
      <header className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold">Adrien — Juliano Pizzaria</h1>
          <p className="text-sm text-black/50 dark:text-white/50">Real-time performance dashboard</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex gap-1 rounded-lg border border-black/10 dark:border-white/10 p-1">
            {PRESETS.map((p) => (
              <button
                key={p}
                onClick={() => setDays(p)}
                className={`px-3 py-1.5 text-sm rounded-md transition ${
                  days === p ? "bg-black text-white dark:bg-white dark:text-black" : "hover:bg-black/5 dark:hover:bg-white/10"
                }`}
              >
                {p}d
              </button>
            ))}
          </div>
          <form
            className="flex items-center gap-1.5"
            onSubmit={(e) => {
              e.preventDefault();
              applyCustomDays(customInput);
            }}
          >
            <span className="text-sm text-black/50 dark:text-white/50">Last</span>
            <input
              type="number"
              min={1}
              max={MAX_DAYS}
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              onBlur={() => applyCustomDays(customInput)}
              className="w-16 rounded-md border border-black/10 dark:border-white/10 bg-transparent px-2 py-1.5 text-sm text-center"
            />
            <span className="text-sm text-black/50 dark:text-white/50">days</span>
          </form>
        </div>
      </header>

      {loading && <div className="text-sm text-black/50">Loading…</div>}

      {data && (
        <>
          {/* Business section */}
          <section className="mb-10">
            <h2 className="text-lg font-semibold mb-3">Business Data (Bite Business)</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatCard label="Total sales" value={data.business.totalSales} unit="currency" />
              <StatCard label="Total orders" value={data.business.totalOrders} unit="number" />
              <StatCard label="Avg order value" value={data.business.avgOrderValue} unit="currency" />
              <StatCard label="New members" value={data.business.newMembers} unit="number" />
            </div>
            <InsightsPanel insights={businessInsights} title="Business insights" />
          </section>

          {/* Performance section */}
          <section className="mb-10">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold">Ad Performance (Google + Meta)</h2>
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
            {data.ads.map((ad) => (
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
            <InsightsPanel insights={adInsights} title="Performance insights & ideas" />
          </section>

          {/* Social section */}
          <section className="mb-10">
            <h2 className="text-lg font-semibold mb-3">Social Media Review</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {data.social.map((s) => (
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
            <InsightsPanel insights={socialInsights} title="Social insights & ideas" />
          </section>
        </>
      )}
    </div>
  );
}
