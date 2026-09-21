import { NextRequest, NextResponse } from "next/server";
import { activateGoogleCampaignTree, GoogleLaunchResult } from "@/lib/creative/googleCampaign";

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as GoogleLaunchResult | null;
  if (!body?.campaignResourceName || !Array.isArray(body.adGroups)) {
    return NextResponse.json({ error: "campaignResourceName and adGroups are required" }, { status: 400 });
  }

  try {
    await activateGoogleCampaignTree(body);
    return NextResponse.json({ ok: true, status: "ENABLED" });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
