import { NextRequest, NextResponse } from "next/server";
import { launchGoogleCampaignTree, GoogleCampaignType } from "@/lib/creative/googleCampaign";

const VALID_TYPES: GoogleCampaignType[] = ["SEARCH", "DISPLAY", "PERFORMANCE_MAX", "VIDEO"];

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid request body" }, { status: 400 });

  const required = ["campaignName", "campaignType", "dailyBudget", "finalUrl", "adGroups"];
  const missing = required.filter((k) => body[k] === undefined || body[k] === null || body[k] === "");
  if (missing.length > 0) {
    return NextResponse.json({ error: `Missing fields: ${missing.join(", ")}` }, { status: 400 });
  }
  if (!VALID_TYPES.includes(body.campaignType)) {
    return NextResponse.json({ error: `campaignType must be one of: ${VALID_TYPES.join(", ")}` }, { status: 400 });
  }
  if (!Array.isArray(body.adGroups) || body.adGroups.length === 0) {
    return NextResponse.json({ error: "At least one ad group is required" }, { status: 400 });
  }
  for (const [i, ag] of body.adGroups.entries()) {
    if (!ag.name) return NextResponse.json({ error: `Ad group ${i + 1} needs a name` }, { status: 400 });
    if (body.campaignType === "VIDEO") {
      if (!ag.videoId) return NextResponse.json({ error: `Ad group "${ag.name}" needs a YouTube video` }, { status: 400 });
      continue;
    }
    if (body.campaignType === "SEARCH" && (!Array.isArray(ag.headlines) || ag.headlines.length < 3)) {
      return NextResponse.json({ error: `Ad group "${ag.name}" needs at least 3 headlines` }, { status: 400 });
    }
    if (!Array.isArray(ag.descriptions) || ag.descriptions.length < 2) {
      return NextResponse.json({ error: `Ad group "${ag.name}" needs at least 2 descriptions` }, { status: 400 });
    }
    if ((body.campaignType === "DISPLAY" || body.campaignType === "PERFORMANCE_MAX") && (!Array.isArray(ag.images) || ag.images.length === 0)) {
      return NextResponse.json({ error: `Ad group "${ag.name}" needs at least one image for ${body.campaignType} campaigns` }, { status: 400 });
    }
  }

  try {
    const result = await launchGoogleCampaignTree({
      campaignName: body.campaignName,
      campaignType: body.campaignType,
      dailyBudget: Number(body.dailyBudget),
      finalUrl: body.finalUrl,
      adGroups: body.adGroups.map((ag: Record<string, unknown>) => ({
        name: ag.name,
        keywords: Array.isArray(ag.keywords) ? ag.keywords : [],
        negativeKeywords: Array.isArray(ag.negativeKeywords) ? ag.negativeKeywords : [],
        headlines: Array.isArray(ag.headlines) ? ag.headlines : [],
        descriptions: Array.isArray(ag.descriptions) ? ag.descriptions : [],
        images: Array.isArray(ag.images) ? ag.images : [],
        videoId: typeof ag.videoId === "string" ? ag.videoId : undefined,
        callToAction: typeof ag.callToAction === "string" ? ag.callToAction : undefined,
      })),
      assets: body.assets && typeof body.assets === "object" ? body.assets : undefined,
    });
    return NextResponse.json({ ok: true, ...result, status: "PAUSED" });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
