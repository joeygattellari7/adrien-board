import { ALL_PLATFORMS, ContentPlatform } from "./platforms";
import { getBrandBrief } from "./brandBrief";
import { socialProvider } from "@/lib/providers";
import { SocialPlatform } from "@/lib/types";

async function withTimeout<T>(fn: (signal: AbortSignal) => Promise<T>, ms: number): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ms);
  try {
    return await fn(controller.signal);
  } finally {
    clearTimeout(timeout);
  }
}

export type CalendarDay = {
  date: string; // YYYY-MM-DD
  format: "reel" | "static";
  tone: "funny" | "serious" | "warm" | "informative";
  idea: string;
  reasoning: string;
};

// ContentPlatform (this feature's taxonomy: meta/youtube/linkedin/tiktok/
// twitter) doesn't map 1:1 to SocialPlatform (the dashboard's Social Media
// Review taxonomy: facebook/instagram/tiktok/youtube — Meta is split into
// two there, and LinkedIn/Twitter aren't tracked at all yet).
const PERFORMANCE_SOURCE: Record<ContentPlatform, SocialPlatform[]> = {
  meta: ["facebook", "instagram"],
  youtube: ["youtube"],
  tiktok: ["tiktok"],
  linkedin: [],
  twitter: [],
};

async function getPerformanceSnapshot(): Promise<string> {
  const range = { start: new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10), end: new Date().toISOString().slice(0, 10), label: "Last 30 days" };
  const lines: string[] = [];
  for (const platform of ALL_PLATFORMS) {
    const sources = PERFORMANCE_SOURCE[platform];
    if (sources.length === 0) {
      lines.push(`${platform}: no performance data tracked yet`);
      continue;
    }
    for (const source of sources) {
      try {
        const summary = await socialProvider.getSummary(source, range);
        const direction = summary.followerChange >= 0 ? "up" : "down";
        lines.push(`${source}: followers ${direction} ${Math.abs(summary.followerChange)}%, engagement rate ${summary.engagementRate}%, ${summary.posts} posts in the last 30 days`);
      } catch {
        lines.push(`${source}: performance data unavailable`);
      }
    }
  }
  return lines.join("\n");
}

function templateCalendar(): CalendarDay[] {
  const formats: ("reel" | "static")[] = ["reel", "static"];
  const tones: ("funny" | "serious" | "warm" | "informative")[] = ["warm", "funny", "informative", "serious"];
  return Array.from({ length: 14 }, (_, i) => {
    const date = new Date(Date.now() + i * 86_400_000).toISOString().slice(0, 10);
    return {
      date,
      format: formats[i % formats.length],
      tone: tones[i % tones.length],
      idea: i % 2 === 0 ? "Behind-the-scenes: making the dough/topping something fresh today" : "Customer favorite spotlight — feature a top-selling item with a quick story",
      reasoning: "Template fallback — set ANTHROPIC_API_KEY for ideas informed by actual performance and platform trends.",
    };
  });
}

async function anthropicCalendar(performanceSnapshot: string, brief: { product: string; offer?: string; tone?: string; details?: string }, apiKey: string): Promise<CalendarDay[] | null> {
  const startDate = new Date().toISOString().slice(0, 10);
  const prompt = `You're planning 14 days of social content for a pizzeria called Juliano Pizzaria, starting ${startDate}.

Recent performance across platforms (last 30 days):
${performanceSnapshot}

Brand brief: product/focus "${brief.product}"${brief.offer ? `, offer: ${brief.offer}` : ""}${brief.tone ? `, tone: ${brief.tone}` : ""}${brief.details ? `, details: ${brief.details}` : ""}

Use the performance numbers above to inform your calls — e.g. if a platform's engagement is declining, suggest something more attention-grabbing (funnier, more reel-heavy) to reverse it; if it's growing, suggest doubling down on whatever's working. You don't have a live trends feed, so for general platform trends, reason from your own knowledge of what tends to perform well on each platform, and say so rather than presenting it as live data.

For each of the next 14 days, give ONE content idea (not per-platform — one flagship idea adaptable across platforms) with:
- format: "reel" or "static"
- tone: "funny", "serious", "warm", or "informative"
- idea: one sentence, concrete and specific (not generic)
- reasoning: one short sentence on why this format/tone/idea, referencing the performance data or general platform trend knowledge

Respond ONLY with a JSON array of 14 objects shaped like {"date": "YYYY-MM-DD", "format": "reel"|"static", "tone": "funny"|"serious"|"warm"|"informative", "idea": "...", "reasoning": "..."}. Dates must be 14 consecutive days starting ${startDate}. No markdown, no explanation, just the JSON array.`;

  try {
    const res = await withTimeout(
      (signal) =>
        fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
          body: JSON.stringify({ model: "claude-sonnet-5", max_tokens: 3000, messages: [{ role: "user", content: prompt }] }),
          signal,
        }),
      30000
    );
    if (!res.ok) return null;
    const json = await res.json();
    const text = json.content?.[0]?.text ?? "";
    const match = text.match(/\[[\s\S]*\]/);
    if (!match) return null;
    const parsed = JSON.parse(match[0]);
    if (!Array.isArray(parsed) || parsed.length === 0) return null;
    return parsed.slice(0, 14).map((d) => ({
      date: String(d.date),
      format: d.format === "static" ? "static" : "reel",
      tone: ["funny", "serious", "warm", "informative"].includes(d.tone) ? d.tone : "warm",
      idea: String(d.idea ?? ""),
      reasoning: String(d.reasoning ?? ""),
    }));
  } catch {
    return null;
  }
}

/**
 * A 14-day content-idea calendar — one flagship idea per day (adapt it per
 * platform when you actually schedule it), informed by real engagement/
 * follower-trend numbers from the Social Media Review data where available,
 * and the AI's general knowledge of platform trends where there's no live
 * trends feed to pull from.
 */
export async function buildTwoWeekCalendar(): Promise<{ days: CalendarDay[]; source: "ai" | "template" }> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const brief = await getBrandBrief();
  if (apiKey) {
    const snapshot = await getPerformanceSnapshot();
    const days = await anthropicCalendar(snapshot, brief, apiKey);
    if (days && days.length > 0) return { days, source: "ai" };
  }
  return { days: templateCalendar(), source: "template" };
}
