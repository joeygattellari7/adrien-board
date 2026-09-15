import { NextRequest, NextResponse } from "next/server";
import { rangeFromDates } from "@/lib/dateRange";
import { adsProvider } from "@/lib/providers/mock";
import { generateAdInsights } from "@/lib/insights";
import { AdPlatform } from "@/lib/types";

const AD_PLATFORMS: AdPlatform[] = ["google", "meta"];

export async function GET(req: NextRequest) {
  const start = req.nextUrl.searchParams.get("start");
  const end = req.nextUrl.searchParams.get("end");
  if (!start || !end) return NextResponse.json({ error: "start and end are required" }, { status: 400 });

  const range = rangeFromDates(start, end, req.nextUrl.searchParams.get("label") ?? undefined);
  const ads = await Promise.all(AD_PLATFORMS.map((p) => adsProvider.getSummary(p, range)));
  const insights = generateAdInsights(ads);

  return NextResponse.json({ range, ads, insights });
}
