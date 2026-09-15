export type DateRange = {
  start: string; // ISO date
  end: string; // ISO date
  label: string;
};

export type MetricPoint = {
  date: string;
  value: number;
};

export type MetricSeries = {
  key: string;
  label: string;
  unit: "currency" | "number" | "percent";
  points: MetricPoint[];
  total: number;
  change: number; // % change vs previous period
};

export type AdPlatform = "google" | "meta";

export type AdAccountSummary = {
  platform: AdPlatform;
  source: "live" | "mock";
  spend: number;
  impressions: number;
  clicks: number;
  reach: number;
  conversions: number;
  revenue: number;
  roas: number;
  ctr: number;
  cpc: number;
  cpa: number;
  // False when the ad account has no purchase/conversion tracking set up
  // (e.g. campaigns optimizing for reach only) — conversions/revenue/roas/cpa
  // are not meaningful in that case and the UI should say so instead of 0.
  conversionTrackingAvailable: boolean;
  series: MetricSeries[];
};

export type SocialPlatform = "facebook" | "instagram" | "tiktok" | "youtube";

export type SocialAccountSummary = {
  platform: SocialPlatform;
  followers: number;
  followerChange: number;
  impressions: number;
  engagementRate: number;
  posts: number;
  series: MetricSeries[];
};

export type BusinessSummary = {
  totalSales: number;
  totalOrders: number;
  avgOrderValue: number;
  newMembers: number;
  returningMemberRate: number;
  orderFrequencyDays: number;
  topItems: { name: string; orders: number; revenue: number }[];
  series: MetricSeries[];
};

export type Insight = {
  id: string;
  category: "performance" | "social" | "business";
  sentiment: "positive" | "negative" | "neutral";
  title: string;
  detail: string;
  recommendation?: string;
};
