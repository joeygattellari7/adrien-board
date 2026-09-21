import { NextRequest, NextResponse } from "next/server";
import { launchCampaignTree, MetaObjective } from "@/lib/creative/metaCampaign";

const VALID_OBJECTIVES: MetaObjective[] = ["OUTCOME_TRAFFIC", "OUTCOME_ENGAGEMENT", "OUTCOME_AWARENESS", "OUTCOME_SALES"];

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid request body" }, { status: 400 });

  const required = ["campaignName", "objective", "budgetType", "budgetAmount", "linkUrl", "adSets"];
  const missing = required.filter((k) => body[k] === undefined || body[k] === null || body[k] === "");
  if (missing.length > 0) {
    return NextResponse.json({ error: `Missing fields: ${missing.join(", ")}` }, { status: 400 });
  }
  if (!VALID_OBJECTIVES.includes(body.objective)) {
    return NextResponse.json({ error: `objective must be one of: ${VALID_OBJECTIVES.join(", ")}` }, { status: 400 });
  }
  if (body.objective === "OUTCOME_SALES" && (!body.pixelId || !body.conversionEvent)) {
    return NextResponse.json({ error: "pixelId and conversionEvent are required for the Sales/Conversion objective" }, { status: 400 });
  }
  if (!Array.isArray(body.adSets) || body.adSets.length === 0) {
    return NextResponse.json({ error: "At least one ad set is required" }, { status: 400 });
  }
  for (const [i, as] of body.adSets.entries()) {
    if (!as.name) return NextResponse.json({ error: `Ad set ${i + 1} needs a name` }, { status: 400 });
    if (!Array.isArray(as.ads) || as.ads.length === 0) {
      return NextResponse.json({ error: `Ad set "${as.name}" needs at least one ad` }, { status: 400 });
    }
    for (const ad of as.ads) {
      if (!ad.headline || !ad.primaryText || !ad.cta) {
        return NextResponse.json({ error: `Every ad needs a headline, primary text, and CTA` }, { status: 400 });
      }
    }
  }

  try {
    const result = await launchCampaignTree({
      campaignName: body.campaignName,
      objective: body.objective,
      budgetType: body.budgetType,
      budgetAmount: Number(body.budgetAmount),
      linkUrl: body.linkUrl,
      pixelId: typeof body.pixelId === "string" ? body.pixelId : undefined,
      conversionEvent: typeof body.conversionEvent === "string" ? body.conversionEvent : undefined,
      adSets: body.adSets.map((as: Record<string, unknown>) => ({
        name: as.name,
        locationQuery: typeof as.locationQuery === "string" && as.locationQuery ? as.locationQuery : undefined,
        radiusKm: as.radiusKm ? Number(as.radiusKm) : undefined,
        countries: Array.isArray(as.countries) ? as.countries : [],
        ageMin: Number(as.ageMin) || 18,
        ageMax: Number(as.ageMax) || 65,
        gender: as.gender ?? "all",
        interests: typeof as.interests === "string" && as.interests ? as.interests : undefined,
        placementMode: as.placementMode ?? "automatic",
        manualPlacements: Array.isArray(as.manualPlacements) ? as.manualPlacements : undefined,
        ads: (as.ads as Record<string, unknown>[]).map((ad) => ({
          name: ad.name,
          headline: ad.headline,
          primaryText: ad.primaryText,
          description: ad.description,
          cta: ad.cta,
          assets: Array.isArray(ad.assets) ? ad.assets : [],
        })),
      })),
    });
    return NextResponse.json({ ok: true, ...result, status: "PAUSED" });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
