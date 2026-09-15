import { NextRequest, NextResponse } from "next/server";
import { presetRange } from "@/lib/dateRange";
import { adsProvider, businessProvider, socialProvider } from "@/lib/providers/mock";
import { generateAdInsights, generateBusinessInsights, generateSocialInsights } from "@/lib/insights";
import { AdPlatform, SocialPlatform } from "@/lib/types";

const AD_PLATFORMS: AdPlatform[] = ["google", "meta"];
const SOCIAL_PLATFORMS: SocialPlatform[] = ["facebook", "instagram", "tiktok", "youtube"];

export async function GET(req: NextRequest) {
  const days = Number(req.nextUrl.searchParams.get("days") ?? "30");
  const range = presetRange(days);

  const [adSummaries, socialSummaries, business] = await Promise.all([
    Promise.all(AD_PLATFORMS.map((p) => adsProvider.getSummary(p, range))),
    Promise.all(SOCIAL_PLATFORMS.map((p) => socialProvider.getSummary(p, range))),
    businessProvider.getSummary(range),
  ]);

  const insights = [
    ...generateAdInsights(adSummaries),
    ...generateBusinessInsights(business),
    ...generateSocialInsights(socialSummaries),
  ];

  return NextResponse.json({ range, ads: adSummaries, social: socialSummaries, business, insights });
}
