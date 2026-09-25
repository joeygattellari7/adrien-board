import { NextRequest, NextResponse } from "next/server";
import { getBrandBrief, saveBrandBrief } from "@/lib/content/brandBrief";

export async function GET() {
  const brief = await getBrandBrief();
  return NextResponse.json({ brief });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body?.product) return NextResponse.json({ error: "product is required" }, { status: 400 });
  const brief = {
    product: body.product,
    offer: typeof body.offer === "string" ? body.offer : undefined,
    tone: typeof body.tone === "string" ? body.tone : undefined,
    details: typeof body.details === "string" ? body.details : undefined,
  };
  await saveBrandBrief(brief);
  return NextResponse.json({ ok: true, brief });
}
