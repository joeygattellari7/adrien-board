import { NextResponse } from "next/server";
import { buildContentPlan } from "@/lib/content/planner";

export async function GET() {
  const proposals = await buildContentPlan();
  return NextResponse.json({ proposals });
}
