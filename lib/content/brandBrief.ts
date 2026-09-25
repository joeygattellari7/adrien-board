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

export type BrandBrief = { product: string; offer?: string; tone?: string; details?: string };

const DEFAULT_BRIEF: BrandBrief = {
  product: "Margherita Pizza",
  tone: "warm, local, appetizing",
};

let memoryBrief: BrandBrief | null = null;

/**
 * The single default product/offer/tone/details brief Adrien Brain uses to
 * generate content when it's proposing posts on its own, rather than you
 * typing a fresh brief in Content Studio every time. Editable from the
 * Adrien Brain tab.
 */
export async function getBrandBrief(): Promise<BrandBrief> {
  if (!redisConfig()) return memoryBrief ?? DEFAULT_BRIEF;
  const raw = (await redisCommand(["GET", "content:brand-brief"])) as string | null;
  return raw ? (JSON.parse(raw) as BrandBrief) : DEFAULT_BRIEF;
}

export async function saveBrandBrief(brief: BrandBrief): Promise<void> {
  if (!redisConfig()) {
    memoryBrief = brief;
    return;
  }
  await redisCommand(["SET", "content:brand-brief", JSON.stringify(brief)]);
}
