import { NextRequest, NextResponse } from "next/server";
import { activateMetaAd } from "@/lib/creative/metaCampaign";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body?.adId || !body?.adSetId) {
    return NextResponse.json({ error: "adId and adSetId are required" }, { status: 400 });
  }

  try {
    await activateMetaAd(body.adId, body.adSetId);
    return NextResponse.json({ ok: true, status: "ACTIVE" });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
