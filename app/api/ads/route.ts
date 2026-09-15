import { NextRequest, NextResponse } from "next/server";
import { CompareOption, compareRangeFor, pctChange, rangeFromDates } from "@/lib/dateRange";
import { adsProvider } from "@/lib/providers/mock";
import { generateAdInsights } from "@/lib/insights";
import { AdAccountSummary, AdPlatform } from "@/lib/types";

const AD_PLATFORMS: AdPlatform[] = ["google", "meta"];
const METRICS = ["spend", "impressions", "clicks", "conversions", "revenue", "roas", "ctr", "cpc", "cpa"] as const;

function metricChanges(current: AdAccountSummary, previous: AdAccountSummary) {
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

  const ads = await Promise.all(AD_PLATFORMS.map((p) => adsProvider.getSummary(p, range)));
  const previous = compareRange
    ? await Promise.all(AD_PLATFORMS.map((p) => adsProvider.getSummary(p, compareRange)))
    : null;
  const insights = generateAdInsights(ads);

  const compare = previous
    ? {
        label: compareRange!.label,
        byPlatform: Object.fromEntries(
          ads.map((a, i) => [a.platform, metricChanges(a, previous[i])])
        ),
      }
    : null;

  return NextResponse.json({ range, ads, insights, compare });
}
