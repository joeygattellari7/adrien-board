import { ALL_PLATFORMS, ContentPlatform } from "./platforms";
import { listScheduledPosts } from "./scheduler";
import { listLibraryAssets } from "./library";
import { generatePlatformCopy } from "./generatePlatformCopy";
import { getBrandBrief } from "./brandBrief";

/**
 * The posting cadence Adrien Brain enforces: never let a platform go more
 * than a day without a post, two at the absolute most. "Due soon" starts
 * showing a few hours before the 24h mark so there's time to act on it
 * before it tips into "overdue".
 */
export const POSTING_RULE = { idealGapHours: 24, maxGapHours: 48, proposeEarlyHours: 4 };

export type ContentProposal = {
  platform: ContentPlatform;
  suggestedTime: string; // ISO
  urgency: "overdue" | "due_soon";
  hoursSinceLastPost: number | null;
  source: "repurpose" | "generate";
  asset?: { id: string; base64: string; label: string };
  caption: string;
  hashtags: string[];
};

/**
 * Looks at every platform's most recent scheduled/published/manual post,
 * and proposes a next post for any platform approaching or past the
 * posting-cadence rule above — pulling from the content library when
 * there's an unused-enough asset to repurpose, or flagging that fresh
 * content needs generating when there isn't one.
 */
export async function buildContentPlan(): Promise<ContentProposal[]> {
  const [posts, assets, brief] = await Promise.all([listScheduledPosts(), listLibraryAssets(), getBrandBrief()]);
  const now = Date.now();

  const lastByPlatform = new Map<ContentPlatform, number>();
  for (const p of posts) {
    if (p.status === "published" || p.status === "scheduled" || p.status === "needs_manual_post") {
      const t = new Date(p.scheduledFor).getTime();
      const current = lastByPlatform.get(p.platform);
      if (!current || t > current) lastByPlatform.set(p.platform, t);
    }
  }

  const duePlatforms = ALL_PLATFORMS.filter((platform) => {
    const last = lastByPlatform.get(platform);
    if (!last) return true;
    const hoursSince = (now - last) / 3_600_000;
    return hoursSince >= POSTING_RULE.idealGapHours - POSTING_RULE.proposeEarlyHours;
  });

  if (duePlatforms.length === 0) return [];

  const copy = await generatePlatformCopy({ ...brief, product: brief.product || "Margherita Pizza", platforms: duePlatforms });

  const sortedAssets = [...assets].sort((a, b) => (a.lastUsedAt ?? "").localeCompare(b.lastUsedAt ?? ""));

  return duePlatforms.map((platform, i) => {
    const last = lastByPlatform.get(platform) ?? null;
    const hoursSince = last ? (now - last) / 3_600_000 : null;
    const urgency: ContentProposal["urgency"] = hoursSince === null || hoursSince >= POSTING_RULE.maxGapHours ? "overdue" : "due_soon";
    const copyResult = copy.results.find((r) => r.platform === platform)!;

    const asset = sortedAssets.length > 0 ? sortedAssets[i % sortedAssets.length] : undefined;
    const suggestedTime = new Date(
      urgency === "overdue" ? now + 30 * 60 * 1000 : (last ?? now) + POSTING_RULE.idealGapHours * 3_600_000
    ).toISOString();

    return {
      platform,
      suggestedTime,
      urgency,
      hoursSinceLastPost: hoursSince,
      source: asset ? "repurpose" : "generate",
      asset: asset ? { id: asset.id, base64: asset.base64, label: asset.label } : undefined,
      caption: copyResult.caption,
      hashtags: copyResult.hashtags,
    };
  });
}
