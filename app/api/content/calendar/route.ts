import { NextResponse } from "next/server";
import { buildTwoWeekCalendar } from "@/lib/content/calendar";

export async function GET() {
  const result = await buildTwoWeekCalendar();
  return NextResponse.json(result);
}
