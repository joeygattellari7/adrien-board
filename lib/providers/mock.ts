import { dateList } from "../dateRange";
import {
  AdAccountSummary,
  AdPlatform,
  BusinessSummary,
  DateRange,
  MetricSeries,
  SocialAccountSummary,
  SocialPlatform,
} from "../types";
import { AdsProvider, BusinessProvider, SocialProvider } from "./types";

function seededRandom(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return () => {
    h = (h * 1664525 + 1013904223) >>> 0;
    return h / 0xffffffff;
  };
}

// A deterministic pseudo-random value for a single day, independent of any
// other day, so different date ranges (and comparisons between them) pull
// real, varying numbers instead of replaying the same sequence.
function dayValue(seed: string, date: string) {
  return seededRandom(`${seed}:${date}`)();
}

function buildSeries(
  key: string,
  label: string,
  unit: MetricSeries["unit"],
  range: DateRange,
  base: number,
  volatility: number,
  seed: string
): MetricSeries {
  const dates = dateList(range);
  let total = 0;
  const points = dates.map((date) => {
    // Slow upward drift over calendar time plus day-to-day noise, so
    // different periods (this month vs last quarter, etc.) differ.
    const dayIndex = Math.floor(new Date(date).getTime() / 86400000);
    const drift = 1 + (Math.sin(dayIndex / 45) + dayIndex / 4000) * 0.15;
    const noise = 1 + (dayValue(seed + key, date) - 0.5) * volatility;
    const value = Math.max(0, base * drift * noise);
    total += value;
    return { date, value: Math.round(value * 100) / 100 };
  });
  const midpoint = dates[Math.floor(dates.length / 2)] ?? range.start;
  const change = Math.round((dayValue(seed + key + "change", midpoint) - 0.4) * 40 * 10) / 10;
  return { key, label, unit, points, total: Math.round(total * 100) / 100, change };
}

export class MockAdsProvider implements AdsProvider {
  async getSummary(platform: AdPlatform, range: DateRange): Promise<AdAccountSummary> {
    const spendSeries = buildSeries("spend", "Spend", "currency", range, platform === "meta" ? 180 : 140, 0.4, platform);
    const impressionsSeries = buildSeries("impressions", "Impressions", "number", range, 12000, 0.5, platform);
    const clicksSeries = buildSeries("clicks", "Clicks", "number", range, 220, 0.5, platform);
    const conversionsSeries = buildSeries("conversions", "Conversions", "number", range, 18, 0.6, platform);
    const revenueSeries = buildSeries("revenue", "Revenue", "currency", range, platform === "meta" ? 520 : 410, 0.45, platform);

    const spend = spendSeries.total;
    const impressions = Math.round(impressionsSeries.total);
    const clicks = Math.round(clicksSeries.total);
    const conversions = Math.round(conversionsSeries.total);
    const revenue = revenueSeries.total;

    return {
      platform,
      spend,
      impressions,
      clicks,
      conversions,
      revenue,
      roas: spend > 0 ? Math.round((revenue / spend) * 100) / 100 : 0,
      ctr: impressions > 0 ? Math.round((clicks / impressions) * 10000) / 100 : 0,
      cpc: clicks > 0 ? Math.round((spend / clicks) * 100) / 100 : 0,
      cpa: conversions > 0 ? Math.round((spend / conversions) * 100) / 100 : 0,
      series: [spendSeries, impressionsSeries, clicksSeries, conversionsSeries, revenueSeries],
    };
  }
}

export class MockSocialProvider implements SocialProvider {
  async getSummary(platform: SocialPlatform, range: DateRange): Promise<SocialAccountSummary> {
    const baseFollowers: Record<SocialPlatform, number> = {
      facebook: 8200,
      instagram: 15400,
      tiktok: 22100,
      youtube: 3100,
    };
    const followersSeries = buildSeries("followers", "Followers", "number", range, baseFollowers[platform] / 30, 0.3, platform);
    const impressionsSeries = buildSeries("impressions", "Impressions", "number", range, 4000, 0.6, platform);
    const engagementSeries = buildSeries("engagement", "Engagement rate", "percent", range, 3.2, 0.5, platform);

    const followerChange = Math.round(followersSeries.change * 10) / 10;

    return {
      platform,
      followers: baseFollowers[platform],
      followerChange,
      impressions: Math.round(impressionsSeries.total),
      engagementRate: Math.round((engagementSeries.total / engagementSeries.points.length) * 100) / 100,
      posts: Math.max(1, Math.round(dateList(range).length / 3)),
      series: [followersSeries, impressionsSeries, engagementSeries],
    };
  }
}

export class MockBusinessProvider implements BusinessProvider {
  async getSummary(range: DateRange): Promise<BusinessSummary> {
    const salesSeries = buildSeries("sales", "Sales", "currency", range, 2400, 0.35, "bite");
    const ordersSeries = buildSeries("orders", "Orders", "number", range, 95, 0.3, "bite");
    const membersSeries = buildSeries("members", "New members", "number", range, 6, 0.7, "bite");

    const totalSales = salesSeries.total;
    const totalOrders = Math.round(ordersSeries.total);

    return {
      totalSales,
      totalOrders,
      avgOrderValue: totalOrders > 0 ? Math.round((totalSales / totalOrders) * 100) / 100 : 0,
      newMembers: Math.round(membersSeries.total),
      returningMemberRate: 42.5,
      orderFrequencyDays: 18,
      topItems: [
        { name: "Margherita Pizza", orders: Math.round(totalOrders * 0.22), revenue: Math.round(totalSales * 0.2) },
        { name: "Pepperoni Pizza", orders: Math.round(totalOrders * 0.18), revenue: Math.round(totalSales * 0.17) },
        { name: "Garlic Bread", orders: Math.round(totalOrders * 0.14), revenue: Math.round(totalSales * 0.08) },
        { name: "Meat Lovers Pizza", orders: Math.round(totalOrders * 0.12), revenue: Math.round(totalSales * 0.13) },
      ],
      series: [salesSeries, ordersSeries, membersSeries],
    };
  }
}

export const adsProvider = new MockAdsProvider();
export const socialProvider = new MockSocialProvider();
export const businessProvider = new MockBusinessProvider();
