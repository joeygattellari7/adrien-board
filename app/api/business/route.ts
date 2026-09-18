import { NextRequest, NextResponse } from "next/server";
import { compareRangeFor, pctChange, rangeFromDates } from "@/lib/dateRange";
import { businessProvider } from "@/lib/providers";
import { generateBusinessInsights } from "@/lib/insights";
import { CompareOption } from "@/lib/dateRange";

export async function GET(req: NextRequest) {
  const start = req.nextUrl.searchParams.get("start");
  const end = req.nextUrl.searchParams.get("end");
  if (!start || !end) return NextResponse.json({ error: "start and end are required" }, { status: 400 });

  const range = rangeFromDates(start, end, req.nextUrl.searchParams.get("label") ?? undefined);
  const compareOption = (req.nextUrl.searchParams.get("compare") as CompareOption | null) ?? "none";
  const compareRange = compareRangeFor(range, compareOption);

  const [business, previous] = await Promise.all([
    businessProvider.getSummary(range),
    compareRange ? businessProvider.getSummary(compareRange) : Promise.resolve(null),
  ]);
  const insights = generateBusinessInsights(business);

  const compare = previous
    ? {
        label: compareRange!.label,
        totalSales: pctChange(business.totalSales, previous.totalSales),
        totalOrders: pctChange(business.totalOrders, previous.totalOrders),
        avgOrderValue: pctChange(business.avgOrderValue, previous.avgOrderValue),
        newMembers: pctChange(business.newMembers, previous.newMembers),
      }
    : null;

  return NextResponse.json({ range, business, insights, compare });
}
