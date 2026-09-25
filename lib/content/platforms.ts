export type ContentPlatform = "meta" | "youtube" | "linkedin" | "tiktok" | "twitter";

export type PlatformSpec = {
  id: ContentPlatform;
  label: string;
  imageAspect: { ratio: string; width: number; height: number }; // primary feed image crop target
  videoAspect: { ratio: string; width: number; height: number };
  maxVideoSeconds: number | null; // null = no hard limit worth enforcing here
  captionMaxChars: number;
  captionStyle: string; // steers the AI prompt
  autoPublish: boolean; // true once the platform's own posting API is wired up
};

export const PLATFORM_SPECS: Record<ContentPlatform, PlatformSpec> = {
  meta: {
    id: "meta",
    label: "Meta (Facebook/Instagram)",
    imageAspect: { ratio: "1:1", width: 1080, height: 1080 },
    videoAspect: { ratio: "9:16", width: 1080, height: 1920 },
    maxVideoSeconds: 90,
    captionMaxChars: 2200,
    captionStyle: "warm, conversational, light emoji use, ends with a soft call to action",
    autoPublish: true,
  },
  youtube: {
    id: "youtube",
    label: "YouTube (Shorts)",
    imageAspect: { ratio: "16:9", width: 1280, height: 720 },
    videoAspect: { ratio: "9:16", width: 1080, height: 1920 },
    maxVideoSeconds: 60,
    captionMaxChars: 5000,
    captionStyle: "a punchy title-style hook first line, then a short description with searchable keywords",
    autoPublish: false,
  },
  linkedin: {
    id: "linkedin",
    label: "LinkedIn",
    imageAspect: { ratio: "1:1", width: 1200, height: 1200 },
    videoAspect: { ratio: "16:9", width: 1920, height: 1080 },
    maxVideoSeconds: 600,
    captionMaxChars: 3000,
    captionStyle: "professional, no emoji or minimal, frames it around the business/craft angle, no hard sell",
    autoPublish: false,
  },
  tiktok: {
    id: "tiktok",
    label: "TikTok",
    imageAspect: { ratio: "9:16", width: 1080, height: 1920 },
    videoAspect: { ratio: "9:16", width: 1080, height: 1920 },
    maxVideoSeconds: 60,
    captionMaxChars: 150,
    captionStyle: "short, casual, trend-aware, hashtag-heavy",
    autoPublish: false,
  },
  twitter: {
    id: "twitter",
    label: "Twitter / X",
    imageAspect: { ratio: "16:9", width: 1200, height: 675 },
    videoAspect: { ratio: "16:9", width: 1280, height: 720 },
    maxVideoSeconds: 140,
    captionMaxChars: 280,
    captionStyle: "tight, punchy, one idea, no filler",
    autoPublish: false,
  },
};

export const ALL_PLATFORMS: ContentPlatform[] = ["meta", "youtube", "linkedin", "tiktok", "twitter"];
