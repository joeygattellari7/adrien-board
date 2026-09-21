import { NextRequest, NextResponse } from "next/server";
import { generateGoogleAdCopy, generateKeywordIdeas } from "@/lib/creative/generateCopy";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body?.product) return NextResponse.json({ error: "product is required" }, { status: 400 });

  const [copy, keywords] = await Promise.all([
    generateGoogleAdCopy({ product: body.product, offer: body.offer, tone: body.tone, details: body.details }),
    generateKeywordIdeas(body.product),
  ]);

  return NextResponse.json({
    headlines: copy.result.headlines,
    descriptions: copy.result.descriptions,
    copySource: copy.source,
    keywords: keywords.keywords,
    keywordSource: keywords.source,
  });
}
