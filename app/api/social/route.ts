import { NextRequest, NextResponse } from "next/server";
import { rangeFromDates } from "@/lib/dateRange";
import { socialProvider } from "@/lib/providers/mock";
import { generateSocialInsights } from "@/lib/insights";
import { SocialPlatform } from "@/lib/types";

const SOCIAL_PLATFORMS: SocialPlatform[] = ["facebook", "instagram", "tiktok", "youtube"];

export async function GET(req: NextRequest) {
  const start = req.nextUrl.searchParams.get("start");
  const end = req.nextUrl.searchParams.get("end");
  if (!start || !end) return NextResponse.json({ error: "start and end are required" }, { status: 400 });

  const range = rangeFromDates(start, end, req.nextUrl.searchParams.get("label") ?? undefined);
  const social = await Promise.all(SOCIAL_PLATFORMS.map((p) => socialProvider.getSummary(p, range)));
  const insights = generateSocialInsights(social);

  return NextResponse.json({ range, social, insights });
}
