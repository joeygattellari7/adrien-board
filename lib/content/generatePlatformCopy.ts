import { ContentPlatform, PLATFORM_SPECS } from "./platforms";

export type PlatformCopyRequest = {
  product: string;
  offer?: string;
  tone?: string;
  details?: string;
  platforms: ContentPlatform[];
};

export type PlatformCopyResult = {
  platform: ContentPlatform;
  caption: string;
  hashtags: string[];
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

function templateCopy(platform: ContentPlatform, req: PlatformCopyRequest): PlatformCopyResult {
  const spec = PLATFORM_SPECS[platform];
  const offer = req.offer ? ` ${req.offer}` : "";
  const templates: Record<ContentPlatform, string> = {
    meta: `Fresh ${req.product} is calling your name.${offer} Order online or swing by Juliano Pizzaria today 🍕`,
    youtube: `${req.product} at Juliano Pizzaria\nWatch how we make our ${req.product} fresh daily.${offer} Order online — link in description.`,
    linkedin: `A look at how Juliano Pizzaria crafts ${req.product} — made fresh, locally, every day.${offer}`,
    tiktok: `${req.product} hits different 🔥${offer} #pizza #juliano #foodie`,
    twitter: `${req.product}, fresh today.${offer} Order now →`,
  };
  const hashtags =
    platform === "tiktok" || platform === "meta"
      ? ["pizza", "julianopizzaria", "freshfood"]
      : platform === "twitter"
        ? ["pizza", "julianopizzaria"]
        : [];
  return {
    platform,
    caption: (req.details ? `${templates[platform]} ${req.details}` : templates[platform]).slice(0, spec.captionMaxChars),
    hashtags,
  };
}

async function anthropicCopy(req: PlatformCopyRequest, apiKey: string): Promise<PlatformCopyResult[] | null> {
  const platformBriefs = req.platforms
    .map((p) => {
      const spec = PLATFORM_SPECS[p];
      return `- ${p}: max ${spec.captionMaxChars} characters, style: ${spec.captionStyle}`;
    })
    .join("\n");

  const prompt = `Write social captions for Juliano Pizzaria, a pizzeria, for these platforms:
${platformBriefs}

Product/focus: ${req.product}
${req.offer ? `Offer: ${req.offer}` : ""}
${req.tone ? `Overall tone: ${req.tone}` : ""}
${req.details ? `Additional brief — follow closely:\n${req.details}` : ""}

Respond ONLY with a JSON array, one object per platform, each shaped like {"platform": "meta", "caption": "...", "hashtags": ["...", "..."]}. Respect each platform's character limit and style. No markdown, no explanation, just the JSON array.`;

  try {
    const res = await withTimeout(
      (signal) =>
        fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
          body: JSON.stringify({ model: "claude-sonnet-5", max_tokens: 2048, messages: [{ role: "user", content: prompt }] }),
          signal,
        }),
      20000
    );
    if (!res.ok) return null;
    const json = await res.json();
    const text = json.content?.[0]?.text ?? "";
    const match = text.match(/\[[\s\S]*\]/);
    if (!match) return null;
    const parsed = JSON.parse(match[0]);
    if (!Array.isArray(parsed)) return null;
    return parsed
      .filter((p) => p && req.platforms.includes(p.platform))
      .map((p) => ({
        platform: p.platform as ContentPlatform,
        caption: String(p.caption ?? "").slice(0, PLATFORM_SPECS[p.platform as ContentPlatform].captionMaxChars),
        hashtags: Array.isArray(p.hashtags) ? p.hashtags.map(String) : [],
      }));
  } catch {
    return null;
  }
}

/**
 * Generates a tailored caption + hashtag set per platform in one pass, each
 * respecting that platform's character limit and tone. Uses the Anthropic
 * API when configured; otherwise falls back to fixed templates so this
 * always returns something usable for every requested platform.
 */
export async function generatePlatformCopy(req: PlatformCopyRequest): Promise<{ results: PlatformCopyResult[]; source: "ai" | "template" }> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (apiKey) {
    const aiResult = await anthropicCopy(req, apiKey);
    if (aiResult && aiResult.length === req.platforms.length) return { results: aiResult, source: "ai" };
  }
  return { results: req.platforms.map((p) => templateCopy(p, req)), source: "template" };
}
