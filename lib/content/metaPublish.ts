import { ScheduledPost } from "./scheduler";

const GRAPH_VERSION = "v21.0";

async function withTimeout<T>(fn: (signal: AbortSignal) => Promise<T>, ms: number): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ms);
  try {
    return await fn(controller.signal);
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Publishes an organic (unpaid) post to the Juliano Pizzaria Facebook Page —
 * separate from the paid ad campaigns in lib/creative/metaCampaign.ts.
 * Photo posts publish immediately; text-only posts (used when a video was
 * queued, since video isn't resized/stored yet — see repurpose.ts) also
 * publish immediately as a feed post.
 *
 * Requires META_ACCESS_TOKEN with the "pages_manage_posts" permission (a
 * third scope, distinct from "ads_read" and "ads_management") and
 * META_PAGE_ID.
 */
export async function publishToMeta(post: ScheduledPost): Promise<{ postId: string }> {
  const token = process.env.META_ACCESS_TOKEN;
  const pageId = process.env.META_PAGE_ID;
  if (!token || !pageId) throw new Error("META_ACCESS_TOKEN and META_PAGE_ID are required to publish to Meta");

  const caption = post.hashtags.length > 0 ? `${post.caption}\n\n${post.hashtags.map((h) => `#${h}`).join(" ")}` : post.caption;

  if (post.mediaType === "image" && post.mediaBase64) {
    const form = new FormData();
    const bytes = Buffer.from(post.mediaBase64, "base64");
    form.append("source", new Blob([bytes]), "image.jpg");
    form.append("caption", caption);
    form.append("access_token", token);
    const res = await withTimeout(
      (signal) => fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${pageId}/photos`, { method: "POST", body: form, signal }),
      30000
    );
    const json = await res.json();
    if (!res.ok) throw new Error(`Meta publish error: ${json.error?.message ?? JSON.stringify(json)}`);
    return { postId: json.post_id ?? json.id };
  }

  const res = await withTimeout(
    (signal) =>
      fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${pageId}/feed`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: caption, access_token: token }),
        signal,
      }),
    20000
  );
  const json = await res.json();
  if (!res.ok) throw new Error(`Meta publish error: ${json.error?.message ?? JSON.stringify(json)}`);
  return { postId: json.id };
}
