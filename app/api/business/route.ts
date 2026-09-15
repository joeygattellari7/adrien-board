import { NextRequest, NextResponse } from "next/server";
import { rangeFromDates } from "@/lib/dateRange";
import { businessProvider } from "@/lib/providers/mock";
import { generateBusinessInsights } from "@/lib/insights";

export async function GET(req: NextRequest) {
  const start = req.nextUrl.searchParams.get("start");
  const end = req.nextUrl.searchParams.get("end");
  if (!start || !end) return NextResponse.json({ error: "start and end are required" }, { status: 400 });

  const range = rangeFromDates(start, end, req.nextUrl.searchParams.get("label") ?? undefined);
  const business = await businessProvider.getSummary(range);
  const insights = generateBusinessInsights(business);

  return NextResponse.json({ range, business, insights });
}
