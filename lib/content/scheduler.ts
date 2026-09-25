import { ContentPlatform } from "./platforms";

export type PostStatus = "scheduled" | "published" | "needs_manual_post" | "failed";

export type ScheduledPost = {
  id: string;
  platform: ContentPlatform;
  caption: string;
  hashtags: string[];
  mediaBase64?: string; // omitted for video — see repurpose.ts note
  mediaType?: "image" | "video";
  scheduledFor: string; // ISO datetime
  status: PostStatus;
  error?: string;
  createdAt: string;
};

async function withTimeout<T>(fn: (signal: AbortSignal) => Promise<T>, ms: number): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ms);
  try {
    return await fn(controller.signal);
  } finally {
    clearTimeout(timeout);
  }
}

function redisConfig(): { url: string; token: string } | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return { url, token };
}

async function redisCommand(command: (string | number)[]): Promise<unknown> {
  const config = redisConfig();
  if (!config) throw new Error("no redis configured");
  const res = await withTimeout(
    (signal) =>
      fetch(config.url, {
        method: "POST",
        headers: { Authorization: `Bearer ${config.token}`, "Content-Type": "application/json" },
        body: JSON.stringify(command),
        signal,
      }),
    8000
  );
  const json = await res.json();
  if (!res.ok) throw new Error(`Redis error: ${JSON.stringify(json)}`);
  return json.result;
}

// In-memory fallback so the scheduler works out of the box for local dev /
// demoing without Upstash configured — NOT persistent across cold starts or
// separate serverless instances. Configure UPSTASH_REDIS_REST_URL and
// UPSTASH_REDIS_REST_TOKEN (from a Vercel Marketplace Redis integration) for
// real persistence in production.
const memoryStore = new Map<string, ScheduledPost>();

export function schedulerBackend(): "redis" | "memory" {
  return redisConfig() ? "redis" : "memory";
}

export async function listScheduledPosts(): Promise<ScheduledPost[]> {
  if (!redisConfig()) {
    return [...memoryStore.values()].sort((a, b) => a.scheduledFor.localeCompare(b.scheduledFor));
  }
  const ids = (await redisCommand(["SMEMBERS", "content:posts:index"])) as string[];
  if (!ids || ids.length === 0) return [];
  const posts = await Promise.all(
    ids.map(async (id) => {
      const raw = (await redisCommand(["GET", `content:post:${id}`])) as string | null;
      return raw ? (JSON.parse(raw) as ScheduledPost) : null;
    })
  );
  return posts.filter((p): p is ScheduledPost => p !== null).sort((a, b) => a.scheduledFor.localeCompare(b.scheduledFor));
}

export async function saveScheduledPost(post: ScheduledPost): Promise<void> {
  if (!redisConfig()) {
    memoryStore.set(post.id, post);
    return;
  }
  await redisCommand(["SET", `content:post:${post.id}`, JSON.stringify(post)]);
  await redisCommand(["SADD", "content:posts:index", post.id]);
}

export async function deleteScheduledPost(id: string): Promise<void> {
  if (!redisConfig()) {
    memoryStore.delete(id);
    return;
  }
  await redisCommand(["DEL", `content:post:${id}`]);
  await redisCommand(["SREM", "content:posts:index", id]);
}

export async function getDuePosts(): Promise<ScheduledPost[]> {
  const all = await listScheduledPosts();
  const now = Date.now();
  return all.filter((p) => p.status === "scheduled" && new Date(p.scheduledFor).getTime() <= now);
}
