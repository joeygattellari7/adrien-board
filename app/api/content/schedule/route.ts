import { NextRequest, NextResponse } from "next/server";
import { ALL_PLATFORMS, ContentPlatform, PLATFORM_SPECS } from "@/lib/content/platforms";
import { deleteScheduledPost, listScheduledPosts, saveScheduledPost, schedulerBackend, ScheduledPost } from "@/lib/content/scheduler";
import { publishToMeta } from "@/lib/content/metaPublish";

export async function GET() {
  const posts = await listScheduledPosts();
  return NextResponse.json({ posts, backend: schedulerBackend() });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid request body" }, { status: 400 });

  const required = ["platform", "caption", "scheduledFor"];
  const missing = required.filter((k) => !body[k]);
  if (missing.length > 0) return NextResponse.json({ error: `Missing fields: ${missing.join(", ")}` }, { status: 400 });
  if (!ALL_PLATFORMS.includes(body.platform)) {
    return NextResponse.json({ error: `platform must be one of: ${ALL_PLATFORMS.join(", ")}` }, { status: 400 });
  }

  const platform: ContentPlatform = body.platform;
  const scheduledFor = new Date(body.scheduledFor);
  if (Number.isNaN(scheduledFor.getTime())) return NextResponse.json({ error: "scheduledFor must be a valid date" }, { status: 400 });

  const post: ScheduledPost = {
    id: crypto.randomUUID(),
    platform,
    caption: String(body.caption).slice(0, PLATFORM_SPECS[platform].captionMaxChars),
    hashtags: Array.isArray(body.hashtags) ? body.hashtags.map(String) : [],
    mediaBase64: typeof body.mediaBase64 === "string" ? body.mediaBase64 : undefined,
    mediaUrl: typeof body.mediaUrl === "string" ? body.mediaUrl : undefined,
    mediaType: body.mediaType === "image" || body.mediaType === "video" ? body.mediaType : undefined,
    scheduledFor: scheduledFor.toISOString(),
    status: "scheduled",
    createdAt: new Date().toISOString(),
  };

  // Post now, right away, if the requested time is already due — rather than
  // waiting for the next cron tick.
  if (scheduledFor.getTime() <= Date.now() && PLATFORM_SPECS[platform].autoPublish) {
    try {
      await publishToMeta(post);
      post.status = "published";
    } catch (e) {
      post.status = "failed";
      post.error = e instanceof Error ? e.message : String(e);
    }
  } else if (scheduledFor.getTime() <= Date.now()) {
    post.status = "needs_manual_post";
  }

  await saveScheduledPost(post);
  return NextResponse.json({ ok: true, post });
}

export async function PATCH(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body?.id || !body?.status) return NextResponse.json({ error: "id and status are required" }, { status: 400 });
  const posts = await listScheduledPosts();
  const post = posts.find((p) => p.id === body.id);
  if (!post) return NextResponse.json({ error: "Post not found" }, { status: 404 });
  post.status = body.status;
  await saveScheduledPost(post);
  return NextResponse.json({ ok: true, post });
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });
  await deleteScheduledPost(id);
  return NextResponse.json({ ok: true });
}
