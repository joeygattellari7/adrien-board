import { NextRequest, NextResponse } from "next/server";
import { generateProductImage } from "@/lib/content/generateImage";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body?.product) return NextResponse.json({ error: "product is required" }, { status: 400 });

  try {
    const base64 = await generateProductImage({
      product: body.product,
      offer: body.offer || undefined,
      tone: body.tone || undefined,
      details: body.details || undefined,
    });
    return NextResponse.json({ base64 });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
