import { NextRequest, NextResponse } from "next/server";
import { generateAdCopy } from "@/lib/creative/generateCopy";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body?.product || typeof body.product !== "string") {
    return NextResponse.json({ error: "product is required" }, { status: 400 });
  }

  const result = await generateAdCopy({
    product: body.product,
    offer: typeof body.offer === "string" ? body.offer : undefined,
    tone: typeof body.tone === "string" ? body.tone : undefined,
    count: typeof body.count === "number" ? body.count : undefined,
  });

  return NextResponse.json(result);
}
