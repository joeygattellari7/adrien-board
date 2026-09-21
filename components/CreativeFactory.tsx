"use client";

import { useState } from "react";
import { CopyVariation } from "@/lib/creative/generateCopy";
import { BudgetType, Gender, MetaObjective, PlacementMode, PlacementOption } from "@/lib/creative/metaCampaign";
import { GoogleCampaignType, GoogleMatchType } from "@/lib/creative/googleCampaign";

const OBJECTIVES: { value: MetaObjective; label: string }[] = [
  { value: "OUTCOME_TRAFFIC", label: "Traffic (clicks to site)" },
  { value: "OUTCOME_ENGAGEMENT", label: "Engagement (likes/comments/shares)" },
  { value: "OUTCOME_AWARENESS", label: "Awareness (reach)" },
  { value: "OUTCOME_SALES", label: "Conversions (requires a pixel)" },
];

const CTA_OPTIONS = ["Order Now", "Learn More", "Shop Now", "Get Offer", "Sign Up"];
const CONVERSION_EVENTS = ["PURCHASE", "ADD_TO_CART", "INITIATE_CHECKOUT", "LEAD", "COMPLETE_REGISTRATION"];
const PLACEMENT_OPTIONS: { value: PlacementOption; label: string }[] = [
  { value: "facebook_feed", label: "Facebook Feed" },
  { value: "facebook_right_column", label: "Facebook Right Column" },
  { value: "facebook_video_feeds", label: "Facebook Video Feeds" },
  { value: "facebook_marketplace", label: "Facebook Marketplace" },
  { value: "facebook_stories", label: "Facebook Stories" },
  { value: "facebook_reels", label: "Facebook Reels" },
  { value: "facebook_reels_overlay", label: "Facebook Reels Overlay" },
  { value: "facebook_search", label: "Facebook Search" },
  { value: "facebook_instream_video", label: "Facebook In-stream Video" },
  { value: "facebook_profile_feed", label: "Facebook Profile Feed" },
  { value: "instagram_feed", label: "Instagram Feed" },
  { value: "instagram_stories", label: "Instagram Stories" },
  { value: "instagram_reels", label: "Instagram Reels" },
  { value: "instagram_explore", label: "Instagram Explore" },
  { value: "instagram_explore_home", label: "Instagram Explore Home" },
  { value: "instagram_profile_feed", label: "Instagram Profile Feed" },
  { value: "instagram_search", label: "Instagram Search" },
  { value: "instagram_shop", label: "Instagram Shop" },
  { value: "messenger_inbox", label: "Messenger Inbox" },
  { value: "messenger_stories", label: "Messenger Stories" },
  { value: "messenger_sponsored", label: "Messenger Sponsored Messages" },
  { value: "audience_network_classic", label: "Audience Network" },
  { value: "audience_network_rewarded", label: "Audience Network Rewarded Video" },
  { value: "threads_feed", label: "Threads Feed" },
];

const GOOGLE_CAMPAIGN_TYPES: { value: GoogleCampaignType; label: string; helper: string }[] = [
  { value: "SEARCH", label: "Search", helper: "Text ads on Google Search, built from keywords." },
  { value: "DISPLAY", label: "Display", helper: "Image-based ads across the Google Display Network." },
  { value: "PERFORMANCE_MAX", label: "Performance Max", helper: "One campaign, automatically placed across Search, Display, YouTube, Gmail and Maps." },
];

let idCounter = 0;
function newId() {
  idCounter += 1;
  return `id-${idCounter}`;
}

type LocalAsset = { id: string; file: File; type: "image" | "video"; format: "1:1" | "9:16" };
type LocalAd = {
  id: string;
  name: string;
  headline: string;
  primaryText: string;
  description: string;
  cta: string;
  assets: LocalAsset[];
};
type LocalAdSet = {
  id: string;
  name: string;
  locationQuery: string;
  radiusKm: string;
  countries: string;
  ageMin: string;
  ageMax: string;
  gender: Gender;
  interests: string;
  placementMode: PlacementMode;
  manualPlacements: PlacementOption[];
  ads: LocalAd[];
};

function newAd(defaults?: Partial<LocalAd>): LocalAd {
  return {
    id: newId(),
    name: "Ad",
    headline: "",
    primaryText: "",
    description: "",
    cta: "Order Now",
    assets: [],
    ...defaults,
  };
}

function newAdSet(index: number): LocalAdSet {
  return {
    id: newId(),
    name: `Ad Set ${index}`,
    locationQuery: "",
    radiusKm: "10",
    countries: "AU",
    ageMin: "18",
    ageMax: "65",
    gender: "all",
    interests: "",
    placementMode: "automatic",
    manualPlacements: [],
    ads: [newAd()],
  };
}

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(",")[1] ?? "");
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function AssetUploader({ assets, onChange }: { assets: LocalAsset[]; onChange: (assets: LocalAsset[]) => void }) {
  function addFile(file: File, type: "image" | "video", format: "1:1" | "9:16") {
    onChange([...assets, { id: newId(), file, type, format }]);
  }
  function remove(id: string) {
    onChange(assets.filter((a) => a.id !== id));
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-2">
        {assets.map((a) => (
          <div key={a.id} className="relative w-20 h-20 rounded-lg border border-black/10 dark:border-white/10 overflow-hidden bg-black/5 dark:bg-white/5">
            {a.type === "image" ? (
              <img src={URL.createObjectURL(a.file)} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-xs text-black/50 dark:text-white/50">
                🎬 video
              </div>
            )}
            <div className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-[9px] text-center py-0.5">{a.format}</div>
            <button
              onClick={() => remove(a.id)}
              className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-black/70 text-white text-[10px] flex items-center justify-center"
            >
              ×
            </button>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="file"
          accept="image/*,video/*"
          id={`asset-input-${assets.length}-${Math.random()}`}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            const isVideo = file.type.startsWith("video/");
            addFile(file, isVideo ? "video" : "image", "1:1");
            e.target.value = "";
          }}
          className="text-xs"
        />
        <span className="text-[10px] text-black/40 dark:text-white/40">Add image or video, then set its format below</span>
      </div>
      {assets.length > 0 && (
        <div className="mt-2 space-y-1">
          {assets.map((a) => (
            <div key={a.id} className="flex items-center gap-2 text-xs">
              <span className="text-black/50 dark:text-white/50 truncate max-w-[120px]">{a.file.name}</span>
              <select
                value={a.format}
                onChange={(e) =>
                  onChange(assets.map((x) => (x.id === a.id ? { ...x, format: e.target.value as "1:1" | "9:16" } : x)))
                }
                className="rounded border border-black/15 dark:border-white/15 bg-transparent px-1.5 py-0.5 text-xs"
              >
                <option value="1:1">1:1 Square</option>
                <option value="9:16">9:16 Vertical</option>
              </select>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

type LaunchResult = {
  campaignId: string;
  adSets: { adSetId: string; adSetName: string; ads: { adId: string; adName: string }[] }[];
  manageUrl: string;
  status: string;
};

// --- Google Ads builder ---

type LocalGoogleImage = { id: string; file: File };
type LocalGoogleAdGroup = {
  id: string;
  name: string;
  keywordsText: string; // one per line — "word" = broad, "word" in quotes = phrase, [word] = exact
  headlines: string[];
  descriptions: string[];
  images: LocalGoogleImage[];
};

function newGoogleAdGroup(index: number): LocalGoogleAdGroup {
  return {
    id: newId(),
    name: `Ad Group ${index}`,
    keywordsText: "",
    headlines: ["", "", ""],
    descriptions: ["", ""],
    images: [],
  };
}

function parseKeywordLines(text: string): { text: string; matchType: GoogleMatchType }[] {
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line) => {
      if (line.startsWith("[") && line.endsWith("]")) return { text: line.slice(1, -1), matchType: "EXACT" as const };
      if (line.startsWith('"') && line.endsWith('"')) return { text: line.slice(1, -1), matchType: "PHRASE" as const };
      return { text: line, matchType: "BROAD" as const };
    });
}

function GoogleImageUploader({ images, onChange }: { images: LocalGoogleImage[]; onChange: (images: LocalGoogleImage[]) => void }) {
  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-2">
        {images.map((img) => (
          <div key={img.id} className="relative w-20 h-20 rounded-lg border border-black/10 dark:border-white/10 overflow-hidden bg-black/5 dark:bg-white/5">
            <img src={URL.createObjectURL(img.file)} alt="" className="w-full h-full object-cover" />
            <button
              onClick={() => onChange(images.filter((i) => i.id !== img.id))}
              className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-black/70 text-white text-[10px] flex items-center justify-center"
            >
              ×
            </button>
          </div>
        ))}
      </div>
      <input
        type="file"
        accept="image/*"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          onChange([...images, { id: newId(), file }]);
          e.target.value = "";
        }}
        className="text-xs"
      />
    </div>
  );
}

type GoogleLaunchResultLocal = {
  campaignResourceName: string;
  campaignId: string;
  campaignType: GoogleCampaignType;
  adGroups: { resourceName: string; name: string; adResourceName?: string }[];
  manageUrl: string;
  status: string;
};

export default function CreativeFactory() {
  const [platform, setPlatform] = useState<"meta" | "google">("meta");

  // Copy generator state
  const [product, setProduct] = useState("Margherita Pizza");
  const [offer, setOffer] = useState("");
  const [tone, setTone] = useState("");
  const [details, setDetails] = useState("");
  const [generating, setGenerating] = useState(false);
  const [copySource, setCopySource] = useState<"ai" | "template" | null>(null);
  const [variations, setVariations] = useState<CopyVariation[]>([]);
  const [copyTargetAdSetId, setCopyTargetAdSetId] = useState<string | null>(null);
  const [copyTargetAdId, setCopyTargetAdId] = useState<string | null>(null);

  // Campaign-level state
  const [campaignName, setCampaignName] = useState("");
  const [objective, setObjective] = useState<MetaObjective>("OUTCOME_TRAFFIC");
  const [budgetType, setBudgetType] = useState<BudgetType>("daily");
  const [budgetAmount, setBudgetAmount] = useState("20");
  const [linkUrl, setLinkUrl] = useState("");
  const [pixelId, setPixelId] = useState("");
  const [conversionEvent, setConversionEvent] = useState("PURCHASE");

  const [adSets, setAdSets] = useState<LocalAdSet[]>([newAdSet(1)]);

  const [previewing, setPreviewing] = useState(false);
  const [launching, setLaunching] = useState(false);
  const [launchError, setLaunchError] = useState<string | null>(null);
  const [launchResult, setLaunchResult] = useState<LaunchResult | null>(null);
  const [activating, setActivating] = useState(false);
  const [activated, setActivated] = useState(false);

  function updateAdSet(id: string, patch: Partial<LocalAdSet>) {
    setAdSets((prev) => prev.map((as) => (as.id === id ? { ...as, ...patch } : as)));
  }
  function addAdSet() {
    setAdSets((prev) => [...prev, newAdSet(prev.length + 1)]);
  }
  function removeAdSet(id: string) {
    setAdSets((prev) => prev.filter((as) => as.id !== id));
  }
  function updateAd(adSetId: string, adId: string, patch: Partial<LocalAd>) {
    setAdSets((prev) =>
      prev.map((as) =>
        as.id !== adSetId ? as : { ...as, ads: as.ads.map((ad) => (ad.id === adId ? { ...ad, ...patch } : ad)) }
      )
    );
  }
  function addAd(adSetId: string) {
    setAdSets((prev) =>
      prev.map((as) => (as.id !== adSetId ? as : { ...as, ads: [...as.ads, newAd({ name: `Ad ${as.ads.length + 1}` })] }))
    );
  }
  function removeAd(adSetId: string, adId: string) {
    setAdSets((prev) => prev.map((as) => (as.id !== adSetId ? as : { ...as, ads: as.ads.filter((ad) => ad.id !== adId) })));
  }
  function toggleManualPlacement(adSetId: string, p: PlacementOption) {
    setAdSets((prev) =>
      prev.map((as) => {
        if (as.id !== adSetId) return as;
        const has = as.manualPlacements.includes(p);
        return { ...as, manualPlacements: has ? as.manualPlacements.filter((x) => x !== p) : [...as.manualPlacements, p] };
      })
    );
  }

  async function handleGenerateCopy(e: React.FormEvent) {
    e.preventDefault();
    setGenerating(true);
    try {
      const res = await fetch("/api/creative/copy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product, offer: offer || undefined, tone: tone || undefined, details: details || undefined, count: 3 }),
      });
      const data = await res.json();
      setVariations(data.variations ?? []);
      setCopySource(data.source ?? null);
    } finally {
      setGenerating(false);
    }
  }

  function useVariation(v: CopyVariation) {
    if (copyTargetAdSetId && copyTargetAdId) {
      updateAd(copyTargetAdSetId, copyTargetAdId, {
        headline: v.headline,
        primaryText: v.primaryText,
        description: v.description,
        cta: v.cta,
      });
    }
  }

  function startPreview(e: React.FormEvent) {
    e.preventDefault();
    setLaunchError(null);
    setPreviewing(true);
  }

  async function handleConfirmLaunch() {
    setLaunching(true);
    setLaunchError(null);
    setLaunchResult(null);
    setActivated(false);
    try {
      const adSetsPayload = await Promise.all(
        adSets.map(async (as) => ({
          name: as.name,
          locationQuery: as.locationQuery || undefined,
          radiusKm: as.radiusKm ? Number(as.radiusKm) : undefined,
          countries: as.locationQuery ? [] : as.countries.split(",").map((c) => c.trim().toUpperCase()).filter(Boolean),
          ageMin: Number(as.ageMin),
          ageMax: Number(as.ageMax),
          gender: as.gender,
          interests: as.interests || undefined,
          placementMode: as.placementMode,
          manualPlacements: as.placementMode === "manual" ? as.manualPlacements : undefined,
          ads: await Promise.all(
            as.ads.map(async (ad) => ({
              name: ad.name,
              headline: ad.headline,
              primaryText: ad.primaryText,
              description: ad.description,
              cta: ad.cta,
              assets: await Promise.all(
                ad.assets.map(async (asset) => ({
                  base64: await fileToBase64(asset.file),
                  type: asset.type,
                  format: asset.format,
                }))
              ),
            }))
          ),
        }))
      );

      const res = await fetch("/api/creative/launch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaignName,
          objective,
          budgetType,
          budgetAmount: Number(budgetAmount),
          linkUrl,
          pixelId: objective === "OUTCOME_SALES" ? pixelId : undefined,
          conversionEvent: objective === "OUTCOME_SALES" ? conversionEvent : undefined,
          adSets: adSetsPayload,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setLaunchError(data.error ?? "Failed to create campaign");
        return;
      }
      setLaunchResult(data);
      setPreviewing(false);
    } finally {
      setLaunching(false);
    }
  }

  async function handleActivate() {
    if (!launchResult) return;
    setActivating(true);
    try {
      const res = await fetch("/api/creative/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(launchResult),
      });
      const data = await res.json();
      if (res.ok) setActivated(true);
      else setLaunchError(data.error ?? "Failed to activate");
    } finally {
      setActivating(false);
    }
  }

  const totalAds = adSets.reduce((sum, as) => sum + as.ads.length, 0);

  // --- Google Ads builder state ---
  const [gCampaignName, setGCampaignName] = useState("");
  const [gCampaignType, setGCampaignType] = useState<GoogleCampaignType>("SEARCH");
  const [gDailyBudget, setGDailyBudget] = useState("20");
  const [gFinalUrl, setGFinalUrl] = useState("");
  const [gAdGroups, setGAdGroups] = useState<LocalGoogleAdGroup[]>([newGoogleAdGroup(1)]);
  const [gGenerating, setGGenerating] = useState<string | null>(null);
  const [gPreviewing, setGPreviewing] = useState(false);
  const [gLaunching, setGLaunching] = useState(false);
  const [gLaunchError, setGLaunchError] = useState<string | null>(null);
  const [gLaunchResult, setGLaunchResult] = useState<GoogleLaunchResultLocal | null>(null);
  const [gActivating, setGActivating] = useState(false);
  const [gActivated, setGActivated] = useState(false);

  function updateGoogleAdGroup(id: string, patch: Partial<LocalGoogleAdGroup>) {
    setGAdGroups((prev) => prev.map((ag) => (ag.id === id ? { ...ag, ...patch } : ag)));
  }
  function addGoogleAdGroup() {
    setGAdGroups((prev) => [...prev, newGoogleAdGroup(prev.length + 1)]);
  }
  function removeGoogleAdGroup(id: string) {
    setGAdGroups((prev) => prev.filter((ag) => ag.id !== id));
  }
  function updateHeadline(agId: string, idx: number, value: string) {
    setGAdGroups((prev) =>
      prev.map((ag) => (ag.id !== agId ? ag : { ...ag, headlines: ag.headlines.map((h, i) => (i === idx ? value : h)) }))
    );
  }
  function addHeadline(agId: string) {
    setGAdGroups((prev) => prev.map((ag) => (ag.id !== agId ? ag : { ...ag, headlines: [...ag.headlines, ""] })));
  }
  function removeHeadline(agId: string, idx: number) {
    setGAdGroups((prev) => prev.map((ag) => (ag.id !== agId ? ag : { ...ag, headlines: ag.headlines.filter((_, i) => i !== idx) })));
  }
  function updateDescription(agId: string, idx: number, value: string) {
    setGAdGroups((prev) =>
      prev.map((ag) => (ag.id !== agId ? ag : { ...ag, descriptions: ag.descriptions.map((d, i) => (i === idx ? value : d)) }))
    );
  }
  function addDescription(agId: string) {
    setGAdGroups((prev) => prev.map((ag) => (ag.id !== agId ? ag : { ...ag, descriptions: [...ag.descriptions, ""] })));
  }
  function removeDescription(agId: string, idx: number) {
    setGAdGroups((prev) => prev.map((ag) => (ag.id !== agId ? ag : { ...ag, descriptions: ag.descriptions.filter((_, i) => i !== idx) })));
  }

  async function handleGenerateGoogleCopy(agId: string) {
    setGGenerating(agId);
    try {
      const res = await fetch("/api/creative/google/copy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product: product || gCampaignName, offer: offer || undefined, tone: tone || undefined, details: details || undefined }),
      });
      const data = await res.json();
      if (!res.ok) return;
      const keywordLines = (data.keywords ?? [])
        .map((k: { text: string; matchType: string }) =>
          k.matchType === "EXACT" ? `[${k.text}]` : k.matchType === "PHRASE" ? `"${k.text}"` : k.text
        )
        .join("\n");
      updateGoogleAdGroup(agId, {
        headlines: data.headlines ?? [],
        descriptions: data.descriptions ?? [],
        keywordsText: keywordLines,
      });
    } finally {
      setGGenerating(null);
    }
  }

  function startGooglePreview(e: React.FormEvent) {
    e.preventDefault();
    setGLaunchError(null);
    setGPreviewing(true);
  }

  async function handleConfirmGoogleLaunch() {
    setGLaunching(true);
    setGLaunchError(null);
    setGLaunchResult(null);
    setGActivated(false);
    try {
      const adGroupsPayload = await Promise.all(
        gAdGroups.map(async (ag) => ({
          name: ag.name,
          keywords: parseKeywordLines(ag.keywordsText),
          headlines: ag.headlines.filter(Boolean),
          descriptions: ag.descriptions.filter(Boolean),
          images: await Promise.all(ag.images.map(async (img) => ({ base64: await fileToBase64(img.file) }))),
        }))
      );

      const res = await fetch("/api/creative/google/launch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaignName: gCampaignName,
          campaignType: gCampaignType,
          dailyBudget: Number(gDailyBudget),
          finalUrl: gFinalUrl,
          adGroups: adGroupsPayload,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setGLaunchError(data.error ?? "Failed to create campaign");
        return;
      }
      setGLaunchResult(data);
      setGPreviewing(false);
    } finally {
      setGLaunching(false);
    }
  }

  async function handleGoogleActivate() {
    if (!gLaunchResult) return;
    setGActivating(true);
    try {
      const res = await fetch("/api/creative/google/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(gLaunchResult),
      });
      const data = await res.json();
      if (res.ok) setGActivated(true);
      else setGLaunchError(data.error ?? "Failed to activate");
    } finally {
      setGActivating(false);
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-4 pb-8">
      {/* Platform switch */}
      <div className="flex items-center gap-2 mb-6">
        <button
          onClick={() => setPlatform("meta")}
          className={`rounded-lg px-4 py-2 text-sm font-medium border ${platform === "meta" ? "bg-blue-600 text-white border-blue-600" : "border-black/15 dark:border-white/15 hover:bg-black/5 dark:hover:bg-white/10"}`}
        >
          Meta Ads
        </button>
        <button
          onClick={() => setPlatform("google")}
          className={`rounded-lg px-4 py-2 text-sm font-medium border ${platform === "google" ? "bg-amber-600 text-white border-amber-600" : "border-black/15 dark:border-white/15 hover:bg-black/5 dark:hover:bg-white/10"}`}
        >
          Google Ads
        </button>
      </div>

      {/* Ad copy generator */}
      <section className="mb-10 rounded-2xl border-2 border-purple-500/25 dark:border-purple-400/25 bg-purple-50/40 dark:bg-purple-950/15 p-5 md:p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-5">
          <span className="h-2.5 w-2.5 rounded-full bg-purple-500" />
          <h2 className="text-xl font-bold tracking-tight">Ad Copy Generator</h2>
        </div>
        <form onSubmit={handleGenerateCopy} className="rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-900 p-4 mb-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
            <div>
              <label className="text-xs font-medium text-black/50 dark:text-white/50">Product / focus</label>
              <input value={product} onChange={(e) => setProduct(e.target.value)} className="w-full mt-1 rounded-lg border border-black/15 dark:border-white/15 bg-transparent px-3 py-2 text-sm" placeholder="e.g. Margherita Pizza" />
            </div>
            <div>
              <label className="text-xs font-medium text-black/50 dark:text-white/50">Offer (optional)</label>
              <input value={offer} onChange={(e) => setOffer(e.target.value)} className="w-full mt-1 rounded-lg border border-black/15 dark:border-white/15 bg-transparent px-3 py-2 text-sm" placeholder="e.g. 20% off this weekend" />
            </div>
            <div>
              <label className="text-xs font-medium text-black/50 dark:text-white/50">Tone (optional)</label>
              <input value={tone} onChange={(e) => setTone(e.target.value)} className="w-full mt-1 rounded-lg border border-black/15 dark:border-white/15 bg-transparent px-3 py-2 text-sm" placeholder="e.g. fun and casual" />
            </div>
          </div>
          <div className="mb-3">
            <label className="text-xs font-medium text-black/50 dark:text-white/50">Extra details / brief (optional)</label>
            <textarea value={details} onChange={(e) => setDetails(e.target.value)} rows={3} placeholder="Anything else the copy should reflect — must-include phrases, brand guidelines, specific ingredients, promo terms, etc." className="w-full mt-1 rounded-lg border border-black/15 dark:border-white/15 bg-transparent px-3 py-2 text-sm" />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button type="submit" disabled={generating || !product} className="rounded-lg bg-purple-600 text-white text-sm font-medium px-4 py-2 hover:bg-purple-700 disabled:opacity-50">
              {generating ? "Generating…" : "Generate copy"}
            </button>
            {adSets.some((as) => as.ads.length > 0) && (
              <div className="flex items-center gap-2 text-xs">
                <span className="text-black/50 dark:text-white/50">Apply to:</span>
                <select
                  value={copyTargetAdSetId && copyTargetAdId ? `${copyTargetAdSetId}::${copyTargetAdId}` : ""}
                  onChange={(e) => {
                    const [asId, adId] = e.target.value.split("::");
                    setCopyTargetAdSetId(asId ?? null);
                    setCopyTargetAdId(adId ?? null);
                  }}
                  className="rounded border border-black/15 dark:border-white/15 bg-transparent px-2 py-1 text-xs"
                >
                  <option value="">Select an ad…</option>
                  {adSets.map((as) =>
                    as.ads.map((ad) => (
                      <option key={ad.id} value={`${as.id}::${ad.id}`}>
                        {as.name} — {ad.name}
                      </option>
                    ))
                  )}
                </select>
              </div>
            )}
          </div>
        </form>

        {variations.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {variations.map((v, i) => (
              <div key={i} className="rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-900 p-4">
                <div className="font-semibold text-sm mb-1">{v.headline}</div>
                <div className="text-sm text-black/70 dark:text-white/70 mb-2">{v.primaryText}</div>
                <div className="text-xs text-black/40 dark:text-white/40 mb-3">{v.description}</div>
                <button
                  onClick={() => useVariation(v)}
                  disabled={!copyTargetAdSetId || !copyTargetAdId}
                  className="w-full rounded-lg border border-purple-500/40 text-purple-700 dark:text-purple-300 text-xs font-medium py-1.5 hover:bg-purple-50 dark:hover:bg-purple-950/30 disabled:opacity-40"
                >
                  {copyTargetAdId ? "Use for selected ad" : "Select an ad above first"}
                </button>
              </div>
            ))}
          </div>
        )}
        {copySource && (
          <div className="text-xs text-black/40 dark:text-white/40 mt-3">
            {copySource === "ai" ? "Generated by AI" : "Generated from templates (set ANTHROPIC_API_KEY for AI-written copy)"}
          </div>
        )}
      </section>

      {/* Campaign builder */}
      {platform === "meta" && (
      <section className="mb-10 rounded-2xl border-2 border-blue-500/25 dark:border-blue-400/25 bg-blue-50/40 dark:bg-blue-950/15 p-5 md:p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-2">
          <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />
          <h2 className="text-xl font-bold tracking-tight">Campaign Builder — Meta</h2>
        </div>
        <p className="text-sm text-black/50 dark:text-white/50 mb-5">
          Build as many ad sets and ads as you need. Everything is created <span className="font-semibold">paused</span> — nothing spends until you review and click Activate.
        </p>

        {!previewing && !launchResult && (
          <form onSubmit={startPreview} className="space-y-4">
            {/* Campaign fields */}
            <div className="rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-900 p-4">
              <div className="text-sm font-semibold mb-3">1. Campaign</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-black/50 dark:text-white/50">Campaign name</label>
                  <input value={campaignName} onChange={(e) => setCampaignName(e.target.value)} required className="w-full mt-1 rounded-lg border border-black/15 dark:border-white/15 bg-transparent px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="text-xs font-medium text-black/50 dark:text-white/50">Objective</label>
                  <select value={objective} onChange={(e) => setObjective(e.target.value as MetaObjective)} className="w-full mt-1 rounded-lg border border-black/15 dark:border-white/15 bg-transparent px-3 py-2 text-sm">
                    {OBJECTIVES.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-black/50 dark:text-white/50">Budget type</label>
                  <select value={budgetType} onChange={(e) => setBudgetType(e.target.value as BudgetType)} className="w-full mt-1 rounded-lg border border-black/15 dark:border-white/15 bg-transparent px-3 py-2 text-sm">
                    <option value="daily">Daily</option>
                    <option value="lifetime">Lifetime (30 days)</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-black/50 dark:text-white/50">
                    {budgetType === "daily" ? "Daily" : "Lifetime"} budget (AUD, split evenly across ad sets)
                  </label>
                  <input type="number" min={2} value={budgetAmount} onChange={(e) => setBudgetAmount(e.target.value)} required className="w-full mt-1 rounded-lg border border-black/15 dark:border-white/15 bg-transparent px-3 py-2 text-sm" />
                </div>
                <div className="md:col-span-2">
                  <label className="text-xs font-medium text-black/50 dark:text-white/50">Link URL</label>
                  <input value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} required placeholder="https://julianopizzaria.bitebusiness.com/" className="w-full mt-1 rounded-lg border border-black/15 dark:border-white/15 bg-transparent px-3 py-2 text-sm" />
                </div>
              </div>
              {objective === "OUTCOME_SALES" && (
                <div className="mt-3 rounded-lg border border-amber-500/30 bg-amber-50 dark:bg-amber-950/20 p-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-black/50 dark:text-white/50">Pixel / dataset ID</label>
                    <input value={pixelId} onChange={(e) => setPixelId(e.target.value)} required placeholder="Pixel ID from Events Manager" className="w-full mt-1 rounded-lg border border-black/15 dark:border-white/15 bg-transparent px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-black/50 dark:text-white/50">Conversion event</label>
                    <select value={conversionEvent} onChange={(e) => setConversionEvent(e.target.value)} className="w-full mt-1 rounded-lg border border-black/15 dark:border-white/15 bg-transparent px-3 py-2 text-sm">
                      {CONVERSION_EVENTS.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  <p className="text-xs text-amber-700 dark:text-amber-400 md:col-span-2">
                    Note: Juliano Pizzaria's Meta account has no pixel configured yet — this objective will fail until one is set up.
                  </p>
                </div>
              )}
            </div>

            {/* Ad sets */}
            <div>
              <div className="text-sm font-semibold mb-2">2. Ad Sets ({adSets.length})</div>
              <div className="space-y-3">
                {adSets.map((as, asIndex) => (
                  <div key={as.id} className="rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-900 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <input
                        value={as.name}
                        onChange={(e) => updateAdSet(as.id, { name: e.target.value })}
                        className="font-semibold text-sm bg-transparent border-b border-transparent hover:border-black/20 dark:hover:border-white/20 focus:border-blue-500 outline-none px-0.5"
                      />
                      {adSets.length > 1 && (
                        <button type="button" onClick={() => removeAdSet(as.id)} className="text-xs text-red-600 dark:text-red-400 hover:underline">
                          Remove ad set
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3">
                      <div className="md:col-span-2">
                        <label className="text-xs font-medium text-black/50 dark:text-white/50">Location (city/suburb — leave blank to use countries)</label>
                        <input value={as.locationQuery} onChange={(e) => updateAdSet(as.id, { locationQuery: e.target.value })} placeholder="e.g. Bondi, NSW" className="w-full mt-1 rounded-lg border border-black/15 dark:border-white/15 bg-transparent px-3 py-2 text-sm" />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-black/50 dark:text-white/50">Radius (km)</label>
                        <input type="number" min={1} max={80} value={as.radiusKm} onChange={(e) => updateAdSet(as.id, { radiusKm: e.target.value })} disabled={!as.locationQuery} className="w-full mt-1 rounded-lg border border-black/15 dark:border-white/15 bg-transparent px-3 py-2 text-sm disabled:opacity-40" />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-black/50 dark:text-white/50">Countries (fallback)</label>
                        <input value={as.countries} onChange={(e) => updateAdSet(as.id, { countries: e.target.value })} disabled={!!as.locationQuery} placeholder="AU" className="w-full mt-1 rounded-lg border border-black/15 dark:border-white/15 bg-transparent px-3 py-2 text-sm disabled:opacity-40" />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-black/50 dark:text-white/50">Age min</label>
                        <input type="number" min={13} max={65} value={as.ageMin} onChange={(e) => updateAdSet(as.id, { ageMin: e.target.value })} className="w-full mt-1 rounded-lg border border-black/15 dark:border-white/15 bg-transparent px-3 py-2 text-sm" />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-black/50 dark:text-white/50">Age max</label>
                        <input type="number" min={13} max={65} value={as.ageMax} onChange={(e) => updateAdSet(as.id, { ageMax: e.target.value })} className="w-full mt-1 rounded-lg border border-black/15 dark:border-white/15 bg-transparent px-3 py-2 text-sm" />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-black/50 dark:text-white/50">Gender</label>
                        <select value={as.gender} onChange={(e) => updateAdSet(as.id, { gender: e.target.value as Gender })} className="w-full mt-1 rounded-lg border border-black/15 dark:border-white/15 bg-transparent px-3 py-2 text-sm">
                          <option value="all">All</option>
                          <option value="male">Male</option>
                          <option value="female">Female</option>
                        </select>
                      </div>
                      <div className="md:col-span-2">
                        <label className="text-xs font-medium text-black/50 dark:text-white/50">Interests (comma-separated)</label>
                        <input value={as.interests} onChange={(e) => updateAdSet(as.id, { interests: e.target.value })} placeholder="e.g. Pizza, Italian cuisine" className="w-full mt-1 rounded-lg border border-black/15 dark:border-white/15 bg-transparent px-3 py-2 text-sm" />
                      </div>
                    </div>

                    <div className="mb-3">
                      <label className="text-xs font-medium text-black/50 dark:text-white/50 block mb-1">Placements</label>
                      <div className="flex items-center gap-4 mb-2">
                        <label className="flex items-center gap-1.5 text-xs">
                          <input type="radio" checked={as.placementMode === "automatic"} onChange={() => updateAdSet(as.id, { placementMode: "automatic" })} />
                          Automatic (Advantage+)
                        </label>
                        <label className="flex items-center gap-1.5 text-xs">
                          <input type="radio" checked={as.placementMode === "manual"} onChange={() => updateAdSet(as.id, { placementMode: "manual" })} />
                          Manual
                        </label>
                      </div>
                      {as.placementMode === "manual" && (
                        <div className="flex flex-wrap gap-2">
                          {PLACEMENT_OPTIONS.map((p) => (
                            <label key={p.value} className={`text-xs px-2 py-1 rounded-full border cursor-pointer ${as.manualPlacements.includes(p.value) ? "bg-blue-600 text-white border-blue-600" : "border-black/15 dark:border-white/15"}`}>
                              <input type="checkbox" checked={as.manualPlacements.includes(p.value)} onChange={() => toggleManualPlacement(as.id, p.value)} className="hidden" />
                              {p.label}
                            </label>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Ads within this ad set */}
                    <div className="mt-4 pt-3 border-t border-black/10 dark:border-white/10">
                      <div className="text-xs font-semibold mb-2">Ads in this ad set ({as.ads.length})</div>
                      <div className="space-y-3">
                        {as.ads.map((ad, adIndex) => (
                          <div key={ad.id} className="rounded-lg border border-black/10 dark:border-white/10 p-3 bg-black/[0.02] dark:bg-white/[0.02]">
                            <div className="flex items-center justify-between mb-2">
                              <input
                                value={ad.name}
                                onChange={(e) => updateAd(as.id, ad.id, { name: e.target.value })}
                                className="text-xs font-medium bg-transparent border-b border-transparent hover:border-black/20 dark:hover:border-white/20 focus:border-blue-500 outline-none"
                              />
                              {as.ads.length > 1 && (
                                <button type="button" onClick={() => removeAd(as.id, ad.id)} className="text-xs text-red-600 dark:text-red-400 hover:underline">
                                  Remove ad
                                </button>
                              )}
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-2">
                              <input value={ad.headline} onChange={(e) => updateAd(as.id, ad.id, { headline: e.target.value })} placeholder="Headline" required className="rounded-lg border border-black/15 dark:border-white/15 bg-transparent px-2.5 py-1.5 text-sm" />
                              <select value={ad.cta} onChange={(e) => updateAd(as.id, ad.id, { cta: e.target.value })} className="rounded-lg border border-black/15 dark:border-white/15 bg-transparent px-2.5 py-1.5 text-sm">
                                {CTA_OPTIONS.map((c) => (
                                  <option key={c} value={c}>{c}</option>
                                ))}
                              </select>
                            </div>
                            <textarea value={ad.primaryText} onChange={(e) => updateAd(as.id, ad.id, { primaryText: e.target.value })} placeholder="Primary text" required rows={2} className="w-full mb-2 rounded-lg border border-black/15 dark:border-white/15 bg-transparent px-2.5 py-1.5 text-sm" />
                            <input value={ad.description} onChange={(e) => updateAd(as.id, ad.id, { description: e.target.value })} placeholder="Description" className="w-full mb-2 rounded-lg border border-black/15 dark:border-white/15 bg-transparent px-2.5 py-1.5 text-sm" />
                            <AssetUploader assets={ad.assets} onChange={(assets) => updateAd(as.id, ad.id, { assets })} />
                          </div>
                        ))}
                      </div>
                      <button type="button" onClick={() => addAd(as.id)} className="mt-2 text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline">
                        + Add another ad to this ad set
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <button type="button" onClick={addAdSet} className="mt-3 rounded-lg border border-blue-500/40 text-blue-700 dark:text-blue-300 text-sm font-medium px-4 py-2 hover:bg-blue-50 dark:hover:bg-blue-950/30">
                + Add another ad set
              </button>
            </div>

            <button type="submit" className="rounded-lg bg-blue-600 text-white text-sm font-medium px-4 py-2 hover:bg-blue-700">
              Preview {adSets.length} ad set{adSets.length !== 1 ? "s" : ""} / {totalAds} ad{totalAds !== 1 ? "s" : ""}
            </button>
          </form>
        )}

        {previewing && (
          <div className="rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-900 p-4">
            <div className="text-sm font-semibold mb-3">Review before creating in Meta</div>
            <div className="text-xs text-black/50 dark:text-white/50 mb-4 space-y-1">
              <div><span className="font-medium">Campaign:</span> {campaignName} ({OBJECTIVES.find((o) => o.value === objective)?.label})</div>
              <div><span className="font-medium">Budget:</span> {budgetType} — ${budgetAmount} split across {adSets.length} ad set{adSets.length !== 1 ? "s" : ""}</div>
              <div><span className="font-medium">Link:</span> {linkUrl}</div>
            </div>
            <div className="space-y-4">
              {adSets.map((as) => (
                <div key={as.id} className="rounded-lg border border-black/10 dark:border-white/10 p-3">
                  <div className="text-sm font-semibold mb-1">{as.name}</div>
                  <div className="text-xs text-black/50 dark:text-white/50 mb-2">
                    {as.locationQuery ? `${as.locationQuery} (${as.radiusKm}km)` : as.countries}, ages {as.ageMin}-{as.ageMax}, {as.gender}
                    {as.interests ? `, interests: ${as.interests}` : ""} — placements: {as.placementMode === "automatic" ? "automatic" : as.manualPlacements.join(", ") || "none selected"}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {as.ads.map((ad) => (
                      <div key={ad.id} className="rounded-lg border border-black/10 dark:border-white/10 p-2.5">
                        <div className="flex gap-2 mb-1">
                          {ad.assets.slice(0, 3).map((a) => (
                            <div key={a.id} className="w-10 h-10 rounded overflow-hidden bg-black/5 dark:bg-white/5 flex-shrink-0">
                              {a.type === "image" ? (
                                <img src={URL.createObjectURL(a.file)} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-[10px]">🎬</div>
                              )}
                            </div>
                          ))}
                        </div>
                        <div className="font-medium text-xs">{ad.headline || "(no headline)"}</div>
                        <div className="text-xs text-black/60 dark:text-white/60">{ad.primaryText || "(no text)"}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            {launchError && (
              <div className="mt-4 rounded-lg border border-red-500/30 bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 text-sm p-3">{launchError}</div>
            )}
            <div className="flex gap-2 mt-4">
              <button onClick={() => setPreviewing(false)} className="rounded-lg border border-black/15 dark:border-white/15 text-sm px-4 py-2 hover:bg-black/5 dark:hover:bg-white/10">Back to edit</button>
              <button onClick={handleConfirmLaunch} disabled={launching} className="rounded-lg bg-blue-600 text-white text-sm font-medium px-4 py-2 hover:bg-blue-700 disabled:opacity-50">
                {launching ? "Creating…" : "Create draft campaign (paused)"}
              </button>
            </div>
          </div>
        )}

        {launchResult && (
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-50 dark:bg-emerald-950/20 p-4">
            <div className="text-sm font-medium mb-1">
              Draft created — status: <span className="font-mono">{activated ? "ACTIVE" : launchResult.status}</span>
            </div>
            <div className="text-xs text-black/50 dark:text-white/50 mb-3 space-y-0.5">
              <div>Campaign {launchResult.campaignId}</div>
              {launchResult.adSets.map((as) => (
                <div key={as.adSetId}>
                  Ad set {as.adSetName} ({as.adSetId}) — {as.ads.length} ad{as.ads.length !== 1 ? "s" : ""}
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              <a href={launchResult.manageUrl} target="_blank" rel="noopener noreferrer" className="rounded-lg border border-black/15 dark:border-white/15 text-sm px-3 py-1.5 hover:bg-black/5 dark:hover:bg-white/10">
                Review in Meta Ads Manager
              </a>
              {!activated ? (
                <button onClick={handleActivate} disabled={activating} className="rounded-lg bg-emerald-600 text-white text-sm font-medium px-3 py-1.5 hover:bg-emerald-700 disabled:opacity-50">
                  {activating ? "Activating…" : "Activate — start spending"}
                </button>
              ) : (
                <span className="text-sm text-emerald-700 dark:text-emerald-400 font-medium px-3 py-1.5">✓ Activated — live on Meta</span>
              )}
              <button
                onClick={() => {
                  setLaunchResult(null);
                  setActivated(false);
                }}
                className="rounded-lg border border-black/15 dark:border-white/15 text-sm px-3 py-1.5 hover:bg-black/5 dark:hover:bg-white/10"
              >
                Start another
              </button>
            </div>
          </div>
        )}
      </section>
      )}

      {/* Google Ads campaign builder */}
      {platform === "google" && (
      <section className="mb-10 rounded-2xl border-2 border-amber-500/25 dark:border-amber-400/25 bg-amber-50/40 dark:bg-amber-950/15 p-5 md:p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-2">
          <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
          <h2 className="text-xl font-bold tracking-tight">Campaign Builder — Google Ads</h2>
        </div>
        <p className="text-sm text-black/50 dark:text-white/50 mb-5">
          Search, Display, or Performance Max. Build as many ad groups as you need. Everything is created <span className="font-semibold">paused</span> — nothing serves until you review and click Activate.
        </p>

        {!gPreviewing && !gLaunchResult && (
          <form onSubmit={startGooglePreview} className="space-y-4">
            <div className="rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-900 p-4">
              <div className="text-sm font-semibold mb-3">1. Campaign</div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                {GOOGLE_CAMPAIGN_TYPES.map((t) => (
                  <label
                    key={t.value}
                    className={`rounded-lg border p-3 cursor-pointer text-sm ${gCampaignType === t.value ? "border-amber-500 bg-amber-50 dark:bg-amber-950/20" : "border-black/15 dark:border-white/15"}`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <input type="radio" checked={gCampaignType === t.value} onChange={() => setGCampaignType(t.value)} />
                      <span className="font-medium">{t.label}</span>
                    </div>
                    <div className="text-xs text-black/50 dark:text-white/50">{t.helper}</div>
                  </label>
                ))}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-black/50 dark:text-white/50">Campaign name</label>
                  <input value={gCampaignName} onChange={(e) => setGCampaignName(e.target.value)} required className="w-full mt-1 rounded-lg border border-black/15 dark:border-white/15 bg-transparent px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="text-xs font-medium text-black/50 dark:text-white/50">Daily budget (AUD)</label>
                  <input type="number" min={2} value={gDailyBudget} onChange={(e) => setGDailyBudget(e.target.value)} required className="w-full mt-1 rounded-lg border border-black/15 dark:border-white/15 bg-transparent px-3 py-2 text-sm" />
                </div>
                <div className="md:col-span-2">
                  <label className="text-xs font-medium text-black/50 dark:text-white/50">Final URL</label>
                  <input value={gFinalUrl} onChange={(e) => setGFinalUrl(e.target.value)} required placeholder="https://julianopizzaria.bitebusiness.com/" className="w-full mt-1 rounded-lg border border-black/15 dark:border-white/15 bg-transparent px-3 py-2 text-sm" />
                </div>
              </div>
              {gCampaignType === "PERFORMANCE_MAX" && (
                <p className="text-xs text-amber-700 dark:text-amber-400 mt-3">
                  Performance Max asset requirements are approximated (Google recommends more headlines/images than the minimum here) — first drafts may need small tweaks in the Google Ads UI before they clear review.
                </p>
              )}
            </div>

            <div>
              <div className="text-sm font-semibold mb-2">
                2. Ad Groups ({gAdGroups.length}){gCampaignType === "PERFORMANCE_MAX" && <span className="font-normal text-black/40 dark:text-white/40"> — shown as Asset Groups in Google Ads</span>}
              </div>
              <div className="space-y-3">
                {gAdGroups.map((ag) => (
                  <div key={ag.id} className="rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-900 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <input
                        value={ag.name}
                        onChange={(e) => updateGoogleAdGroup(ag.id, { name: e.target.value })}
                        className="font-semibold text-sm bg-transparent border-b border-transparent hover:border-black/20 dark:hover:border-white/20 focus:border-amber-500 outline-none px-0.5"
                      />
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => handleGenerateGoogleCopy(ag.id)}
                          disabled={gGenerating === ag.id}
                          className="text-xs font-medium text-amber-700 dark:text-amber-400 hover:underline disabled:opacity-50"
                        >
                          {gGenerating === ag.id ? "Generating…" : "✨ Generate headlines, descriptions & keywords"}
                        </button>
                        {gAdGroups.length > 1 && (
                          <button type="button" onClick={() => removeGoogleAdGroup(ag.id)} className="text-xs text-red-600 dark:text-red-400 hover:underline">
                            Remove
                          </button>
                        )}
                      </div>
                    </div>

                    {gCampaignType === "SEARCH" && (
                      <div className="mb-3">
                        <label className="text-xs font-medium text-black/50 dark:text-white/50">
                          Keywords — one per line. Plain = broad, &quot;in quotes&quot; = phrase, [in brackets] = exact
                        </label>
                        <textarea
                          value={ag.keywordsText}
                          onChange={(e) => updateGoogleAdGroup(ag.id, { keywordsText: e.target.value })}
                          rows={4}
                          placeholder={'pizza delivery\n"margherita pizza"\n[juliano pizzaria]'}
                          className="w-full mt-1 rounded-lg border border-black/15 dark:border-white/15 bg-transparent px-3 py-2 text-sm font-mono"
                        />
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                      <div>
                        <label className="text-xs font-medium text-black/50 dark:text-white/50 block mb-1">Headlines (max 30 characters each)</label>
                        <div className="space-y-1.5">
                          {ag.headlines.map((h, i) => (
                            <div key={i} className="flex items-center gap-1.5">
                              <input
                                value={h}
                                maxLength={30}
                                onChange={(e) => updateHeadline(ag.id, i, e.target.value)}
                                placeholder={`Headline ${i + 1}`}
                                className="flex-1 rounded-lg border border-black/15 dark:border-white/15 bg-transparent px-2.5 py-1.5 text-sm"
                              />
                              {ag.headlines.length > 1 && (
                                <button type="button" onClick={() => removeHeadline(ag.id, i)} className="text-red-600 dark:text-red-400 text-sm px-1">×</button>
                              )}
                            </div>
                          ))}
                        </div>
                        <button type="button" onClick={() => addHeadline(ag.id)} className="mt-1.5 text-xs font-medium text-amber-700 dark:text-amber-400 hover:underline">+ Add headline</button>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-black/50 dark:text-white/50 block mb-1">Descriptions (max 90 characters each)</label>
                        <div className="space-y-1.5">
                          {ag.descriptions.map((d, i) => (
                            <div key={i} className="flex items-center gap-1.5">
                              <input
                                value={d}
                                maxLength={90}
                                onChange={(e) => updateDescription(ag.id, i, e.target.value)}
                                placeholder={`Description ${i + 1}`}
                                className="flex-1 rounded-lg border border-black/15 dark:border-white/15 bg-transparent px-2.5 py-1.5 text-sm"
                              />
                              {ag.descriptions.length > 1 && (
                                <button type="button" onClick={() => removeDescription(ag.id, i)} className="text-red-600 dark:text-red-400 text-sm px-1">×</button>
                              )}
                            </div>
                          ))}
                        </div>
                        <button type="button" onClick={() => addDescription(ag.id)} className="mt-1.5 text-xs font-medium text-amber-700 dark:text-amber-400 hover:underline">+ Add description</button>
                      </div>
                    </div>

                    {gCampaignType !== "SEARCH" && (
                      <div>
                        <label className="text-xs font-medium text-black/50 dark:text-white/50 block mb-1">Images</label>
                        <GoogleImageUploader images={ag.images} onChange={(images) => updateGoogleAdGroup(ag.id, { images })} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <button type="button" onClick={addGoogleAdGroup} className="mt-3 rounded-lg border border-amber-500/40 text-amber-700 dark:text-amber-400 text-sm font-medium px-4 py-2 hover:bg-amber-50 dark:hover:bg-amber-950/30">
                + Add another ad group
              </button>
            </div>

            <button type="submit" className="rounded-lg bg-amber-600 text-white text-sm font-medium px-4 py-2 hover:bg-amber-700">
              Preview {gAdGroups.length} ad group{gAdGroups.length !== 1 ? "s" : ""}
            </button>
          </form>
        )}

        {gPreviewing && (
          <div className="rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-900 p-4">
            <div className="text-sm font-semibold mb-3">Review before creating in Google Ads</div>
            <div className="text-xs text-black/50 dark:text-white/50 mb-4 space-y-1">
              <div><span className="font-medium">Campaign:</span> {gCampaignName} ({GOOGLE_CAMPAIGN_TYPES.find((t) => t.value === gCampaignType)?.label})</div>
              <div><span className="font-medium">Budget:</span> ${gDailyBudget}/day</div>
              <div><span className="font-medium">Final URL:</span> {gFinalUrl}</div>
            </div>
            <div className="space-y-3">
              {gAdGroups.map((ag) => (
                <div key={ag.id} className="rounded-lg border border-black/10 dark:border-white/10 p-3">
                  <div className="text-sm font-semibold mb-1">{ag.name}</div>
                  {gCampaignType === "SEARCH" && (
                    <div className="text-xs text-black/50 dark:text-white/50 mb-2">
                      {parseKeywordLines(ag.keywordsText).length} keyword{parseKeywordLines(ag.keywordsText).length !== 1 ? "s" : ""}
                    </div>
                  )}
                  <div className="flex gap-2 mb-2">
                    {ag.images.slice(0, 3).map((img) => (
                      <div key={img.id} className="w-10 h-10 rounded overflow-hidden bg-black/5 dark:bg-white/5 flex-shrink-0">
                        <img src={URL.createObjectURL(img.file)} alt="" className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                  <div className="font-medium text-sm">{ag.headlines.filter(Boolean)[0] || "(no headline)"}</div>
                  <div className="text-xs text-black/60 dark:text-white/60">{ag.descriptions.filter(Boolean)[0] || "(no description)"}</div>
                </div>
              ))}
            </div>
            {gLaunchError && (
              <div className="mt-4 rounded-lg border border-red-500/30 bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 text-sm p-3">{gLaunchError}</div>
            )}
            <div className="flex gap-2 mt-4">
              <button onClick={() => setGPreviewing(false)} className="rounded-lg border border-black/15 dark:border-white/15 text-sm px-4 py-2 hover:bg-black/5 dark:hover:bg-white/10">Back to edit</button>
              <button onClick={handleConfirmGoogleLaunch} disabled={gLaunching} className="rounded-lg bg-amber-600 text-white text-sm font-medium px-4 py-2 hover:bg-amber-700 disabled:opacity-50">
                {gLaunching ? "Creating…" : "Create draft campaign (paused)"}
              </button>
            </div>
          </div>
        )}

        {gLaunchResult && (
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-50 dark:bg-emerald-950/20 p-4">
            <div className="text-sm font-medium mb-1">
              Draft created — status: <span className="font-mono">{gActivated ? "ENABLED" : gLaunchResult.status}</span>
            </div>
            <div className="text-xs text-black/50 dark:text-white/50 mb-3 space-y-0.5">
              <div>Campaign {gLaunchResult.campaignId}</div>
              {gLaunchResult.adGroups.map((ag) => (
                <div key={ag.resourceName}>{ag.name}</div>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              <a href={gLaunchResult.manageUrl} target="_blank" rel="noopener noreferrer" className="rounded-lg border border-black/15 dark:border-white/15 text-sm px-3 py-1.5 hover:bg-black/5 dark:hover:bg-white/10">
                Review in Google Ads
              </a>
              {!gActivated ? (
                <button onClick={handleGoogleActivate} disabled={gActivating} className="rounded-lg bg-emerald-600 text-white text-sm font-medium px-3 py-1.5 hover:bg-emerald-700 disabled:opacity-50">
                  {gActivating ? "Activating…" : "Activate — start spending"}
                </button>
              ) : (
                <span className="text-sm text-emerald-700 dark:text-emerald-400 font-medium px-3 py-1.5">✓ Activated — live on Google</span>
              )}
              <button
                onClick={() => {
                  setGLaunchResult(null);
                  setGActivated(false);
                }}
                className="rounded-lg border border-black/15 dark:border-white/15 text-sm px-3 py-1.5 hover:bg-black/5 dark:hover:bg-white/10"
              >
                Start another
              </button>
            </div>
          </div>
        )}
      </section>
      )}
    </div>
  );
}
