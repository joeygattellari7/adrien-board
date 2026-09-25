import { NextRequest, NextResponse } from "next/server";
import { getDuePosts, saveScheduledPost } from "@/lib/content/scheduler";
import { publishToMeta } from "@/lib/content/metaPublish";
import { PLATFORM_SPECS } from "@/lib/content/platforms";

/**
 * Called on a schedule by Vercel Cron (see vercel.json) to publish any due
 * posts. Meta posts publish automatically; every other platform doesn't
 * have a posting API wired up yet, so due posts there just flip to
 * "needs_manual_post" so the Scheduler tab can surface a reminder.
 *
 * Protect with CRON_SECRET — Vercel Cron sends it as a Bearer token
 * automatically when set; this route rejects any other caller.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const due = await getDuePosts();
  const results = [];

  for (const post of due) {
    if (PLATFORM_SPECS[post.platform].autoPublish) {
      try {
        await publishToMeta(post);
        post.status = "published";
      } catch (e) {
        post.status = "failed";
        post.error = e instanceof Error ? e.message : String(e);
      }
    } else {
      post.status = "needs_manual_post";
    }
    await saveScheduledPost(post);
    results.push({ id: post.id, platform: post.platform, status: post.status });
  }

  return NextResponse.json({ ok: true, processed: results.length, results });
}
