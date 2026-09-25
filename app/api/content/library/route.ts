import { NextRequest, NextResponse } from "next/server";
import { deleteLibraryAsset, libraryBackend, listLibraryAssets, saveLibraryAsset, touchLibraryAsset, LibraryAsset } from "@/lib/content/library";

export async function GET() {
  const assets = await listLibraryAssets();
  return NextResponse.json({ assets, backend: libraryBackend() });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body?.base64) return NextResponse.json({ error: "base64 is required" }, { status: 400 });

  const asset: LibraryAsset = {
    id: crypto.randomUUID(),
    base64: body.base64,
    label: typeof body.label === "string" && body.label ? body.label : "Untitled asset",
    tags: Array.isArray(body.tags) ? body.tags.map(String) : [],
    createdAt: new Date().toISOString(),
    timesUsed: 0,
  };
  await saveLibraryAsset(asset);
  return NextResponse.json({ ok: true, asset });
}

export async function PATCH(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body?.id) return NextResponse.json({ error: "id is required" }, { status: 400 });
  await touchLibraryAsset(body.id);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });
  await deleteLibraryAsset(id);
  return NextResponse.json({ ok: true });
}
