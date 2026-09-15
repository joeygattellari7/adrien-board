import { NextRequest, NextResponse } from "next/server";
import { CompareOption, compareRangeFor, pctChange, rangeFromDates } from "@/lib/dateRange";
import { socialProvider } from "@/lib/providers/mock";
import { generateSocialInsights } from "@/lib/insights";
import { SocialAccountSummary, SocialPlatform } from "@/lib/types";

const SOCIAL_PLATFORMS: SocialPlatform[] = ["facebook", "instagram", "tiktok", "youtube"];
const METRICS = ["followers", "impressions", "engagementRate"] as const;

function metricChanges(current: SocialAccountSummary, previous: SocialAccountSummary) {
  const out: Record<string, number> = {};
  for (const m of METRICS) out[m] = pctChange(current[m], previous[m]);
  return out;
}

export async function GET(req: NextRequest) {
  const start = req.nextUrl.searchParams.get("start");
  const end = req.nextUrl.searchParams.get("end");
  if (!start || !end) return NextResponse.json({ error: "start and end are required" }, { status: 400 });

  const range = rangeFromDates(start, end, req.nextUrl.searchParams.get("label") ?? undefined);
  const compareOption = (req.nextUrl.searchParams.get("compare") as CompareOption | null) ?? "none";
  const compareRange = compareRangeFor(range, compareOption);

  const social = await Promise.all(SOCIAL_PLATFORMS.map((p) => socialProvider.getSummary(p, range)));
  const previous = compareRange
    ? await Promise.all(SOCIAL_PLATFORMS.map((p) => socialProvider.getSummary(p, compareRange)))
    : null;
  const insights = generateSocialInsights(social);

  const compare = previous
    ? {
        label: compareRange!.label,
        byPlatform: Object.fromEntries(
          social.map((s, i) => [s.platform, metricChanges(s, previous[i])])
        ),
      }
    : null;

  return NextResponse.json({ range, social, insights, compare });
}
