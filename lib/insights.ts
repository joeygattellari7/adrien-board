import { AdAccountSummary, BusinessSummary, Insight, SocialAccountSummary } from "./types";

let counter = 0;
function nextId() {
  counter += 1;
  return `insight-${counter}`;
}

export function generateAdInsights(summaries: AdAccountSummary[]): Insight[] {
  const insights: Insight[] = [];

  for (const s of summaries) {
    const platformName = s.platform === "meta" ? "Meta" : "Google";

    if (!s.conversionTrackingAvailable) {
      insights.push({
        id: nextId(),
        category: "performance",
        platform: s.platform,
        sentiment: "neutral",
        title: `${platformName} has no conversion tracking set up`,
        detail: `Campaigns are optimizing for reach/traffic, so revenue, ROAS, conversions, and CPA can't be measured yet.`,
        recommendation: `Add the ${platformName === "Meta" ? "Meta Pixel or Conversions API" : "Google Ads conversion tag"} to your ordering site and switch campaigns to a purchase objective to unlock ROAS tracking.`,
      });
    } else if (s.roas >= 3) {
      insights.push({
        id: nextId(),
        category: "performance",
        platform: s.platform,
        sentiment: "positive",
        title: `${platformName} ROAS is strong at ${s.roas}x`,
        detail: `Spend of $${s.spend.toFixed(0)} generated $${s.revenue.toFixed(0)} in tracked revenue.`,
        recommendation: `Consider increasing daily budget on your top ${platformName} campaign by 15-20% to capture more volume while ROAS holds.`,
      });
    } else if (s.roas < 1.5) {
      insights.push({
        id: nextId(),
        category: "performance",
        platform: s.platform,
        sentiment: "negative",
        title: `${platformName} ROAS is weak at ${s.roas}x`,
        detail: `Spend of $${s.spend.toFixed(0)} is not converting efficiently (CPA $${s.cpa.toFixed(2)}).`,
        recommendation: `Test new ad copy leaning on a limited-time offer or bundle deal, and check if targeting is too broad.`,
      });
    }

    if (s.ctr < 1) {
      insights.push({
        id: nextId(),
        category: "performance",
        platform: s.platform,
        sentiment: "negative",
        title: `${platformName} CTR is below 1% (${s.ctr}%)`,
        detail: `Low click-through suggests creative fatigue or weak hooks.`,
        recommendation: `Try a new creative angle: a close-up of a signature pizza slice with a bold discount headline, or a short video of the oven/kitchen.`,
      });
    }
  }

  return insights;
}

export function generateSocialInsights(summaries: SocialAccountSummary[]): Insight[] {
  const insights: Insight[] = [];
  for (const s of summaries) {
    const name = s.platform[0].toUpperCase() + s.platform.slice(1);
    if (s.followerChange > 5) {
      insights.push({
        id: nextId(),
        category: "social",
        sentiment: "positive",
        title: `${name} follower growth is accelerating (+${s.followerChange}%)`,
        detail: `Engagement rate is ${s.engagementRate}% across ${s.posts} posts this period.`,
        recommendation: `Double down on whatever content type drove this — repost your top performer as a Story/Reel highlight.`,
      });
    } else if (s.followerChange < 0) {
      insights.push({
        id: nextId(),
        category: "social",
        sentiment: "negative",
        title: `${name} followers declined (${s.followerChange}%)`,
        detail: `Posting cadence: ${s.posts} posts this period.`,
        recommendation: `Increase posting frequency and try behind-the-scenes content (pizza-making, staff) which tends to outperform static menu posts.`,
      });
    }
    if (s.engagementRate < 1.5) {
      insights.push({
        id: nextId(),
        category: "social",
        sentiment: "negative",
        title: `${name} engagement rate is low (${s.engagementRate}%)`,
        detail: `Low engagement relative to follower count.`,
        recommendation: `Add a clear call-to-action (tag a friend, comment your order) and post at peak local dinner hours.`,
      });
    }
  }
  return insights;
}

export function generateBusinessInsights(b: BusinessSummary): Insight[] {
  const insights: Insight[] = [];
  if (b.returningMemberRate < 40) {
    insights.push({
      id: nextId(),
      category: "business",
      sentiment: "negative",
      title: `Returning member rate is ${b.returningMemberRate}%`,
      detail: `Average order frequency is every ${b.orderFrequencyDays} days.`,
      recommendation: `Launch a loyalty perk (e.g. free garlic bread on 5th order) to bring frequency down toward 10-14 days.`,
    });
  } else {
    insights.push({
      id: nextId(),
      category: "business",
      sentiment: "positive",
      title: `Returning member rate is healthy at ${b.returningMemberRate}%`,
      detail: `Average order frequency is every ${b.orderFrequencyDays} days.`,
    });
  }

  const top = b.topItems[0];
  if (top) {
    insights.push({
      id: nextId(),
      category: "business",
      sentiment: "positive",
      title: `${top.name} is your top seller`,
      detail: `${top.orders} orders, $${top.revenue.toFixed(0)} in revenue this period.`,
      recommendation: `Feature ${top.name} in your next ad creative and social post — it has proven demand.`,
    });
  }

  return insights;
}
