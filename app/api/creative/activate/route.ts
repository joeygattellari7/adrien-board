import { NextRequest, NextResponse } from "next/server";
import { activateCampaignTree, LaunchResult } from "@/lib/creative/metaCampaign";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null) as LaunchResult | null;
  if (!body?.campaignId || !Array.isArray(body.adSets)) {
    return NextResponse.json({ error: "campaignId and adSets are required" }, { status: 400 });
  }

  try {
    await activateCampaignTree(body);
    return NextResponse.json({ ok: true, status: "ACTIVE" });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
