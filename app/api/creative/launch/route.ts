import { NextRequest, NextResponse } from "next/server";
import { launchMetaCampaign, MetaObjective } from "@/lib/creative/metaCampaign";

const VALID_OBJECTIVES: MetaObjective[] = ["OUTCOME_TRAFFIC", "OUTCOME_ENGAGEMENT", "OUTCOME_AWARENESS", "OUTCOME_SALES"];

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid request body" }, { status: 400 });

  const required = [
    "campaignName",
    "adSetName",
    "objective",
    "dailyBudget",
    "headline",
    "primaryText",
    "description",
    "cta",
    "linkUrl",
    "targeting",
  ];
  const missing = required.filter((k) => !body[k]);
  if (missing.length > 0) {
    return NextResponse.json({ error: `Missing fields: ${missing.join(", ")}` }, { status: 400 });
  }
  if (!VALID_OBJECTIVES.includes(body.objective)) {
    return NextResponse.json({ error: `objective must be one of: ${VALID_OBJECTIVES.join(", ")}` }, { status: 400 });
  }
  if (body.objective === "OUTCOME_SALES" && (!body.pixelId || !body.conversionEvent)) {
    return NextResponse.json({ error: "pixelId and conversionEvent are required for the Sales/Conversion objective" }, { status: 400 });
  }

  try {
    const result = await launchMetaCampaign({
      campaignName: body.campaignName,
      adSetName: body.adSetName,
      objective: body.objective,
      dailyBudget: Number(body.dailyBudget),
      headline: body.headline,
      primaryText: body.primaryText,
      description: body.description,
      cta: body.cta,
      linkUrl: body.linkUrl,
      targeting: {
        countries: Array.isArray(body.targeting.countries) && body.targeting.countries.length > 0 ? body.targeting.countries : ["AU"],
        ageMin: Number(body.targeting.ageMin) || 18,
        ageMax: Number(body.targeting.ageMax) || 65,
        gender: body.targeting.gender ?? "all",
        interests: typeof body.targeting.interests === "string" ? body.targeting.interests : undefined,
      },
      pixelId: typeof body.pixelId === "string" ? body.pixelId : undefined,
      conversionEvent: typeof body.conversionEvent === "string" ? body.conversionEvent : undefined,
      squareImageBase64: typeof body.squareImageBase64 === "string" ? body.squareImageBase64 : undefined,
      verticalImageBase64: typeof body.verticalImageBase64 === "string" ? body.verticalImageBase64 : undefined,
    });
    return NextResponse.json({ ok: true, ...result, status: "PAUSED" });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
