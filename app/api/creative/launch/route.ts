import { NextRequest, NextResponse } from "next/server";
import { launchMetaCampaign, MetaObjective } from "@/lib/creative/metaCampaign";

const VALID_OBJECTIVES: MetaObjective[] = ["OUTCOME_TRAFFIC", "OUTCOME_ENGAGEMENT", "OUTCOME_AWARENESS"];

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid request body" }, { status: 400 });

  const required = ["campaignName", "objective", "dailyBudget", "headline", "primaryText", "description", "cta", "linkUrl"];
  const missing = required.filter((k) => !body[k]);
  if (missing.length > 0) {
    return NextResponse.json({ error: `Missing fields: ${missing.join(", ")}` }, { status: 400 });
  }
  if (!VALID_OBJECTIVES.includes(body.objective)) {
    return NextResponse.json({ error: `objective must be one of: ${VALID_OBJECTIVES.join(", ")}` }, { status: 400 });
  }

  try {
    const result = await launchMetaCampaign({
      campaignName: body.campaignName,
      objective: body.objective,
      dailyBudget: Number(body.dailyBudget),
      headline: body.headline,
      primaryText: body.primaryText,
      description: body.description,
      cta: body.cta,
      linkUrl: body.linkUrl,
      imageBase64: typeof body.imageBase64 === "string" ? body.imageBase64 : undefined,
    });
    return NextResponse.json({ ok: true, ...result, status: "PAUSED" });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
