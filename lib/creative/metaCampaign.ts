const GRAPH_VERSION = "v21.0";

export type MetaObjective = "OUTCOME_TRAFFIC" | "OUTCOME_ENGAGEMENT" | "OUTCOME_AWARENESS" | "OUTCOME_SALES";

const OPTIMIZATION_GOAL: Record<MetaObjective, string> = {
  OUTCOME_TRAFFIC: "LINK_CLICKS",
  OUTCOME_ENGAGEMENT: "POST_ENGAGEMENT",
  OUTCOME_AWARENESS: "REACH",
  OUTCOME_SALES: "OFFSITE_CONVERSIONS",
};

export type Gender = "all" | "male" | "female";
export type BudgetType = "daily" | "lifetime";
export type PlacementMode = "automatic" | "manual";
export type PlacementOption =
  | "facebook_feed"
  | "instagram_feed"
  | "facebook_stories"
  | "instagram_stories"
  | "facebook_reels"
  | "instagram_reels"
  | "marketplace"
  | "audience_network";

const CTA_MAP: Record<string, string> = {
  "Order Now": "ORDER_NOW",
  "Learn More": "LEARN_MORE",
  "Shop Now": "SHOP_NOW",
  "Get Offer": "GET_OFFER",
  "Sign Up": "SIGN_UP",
};

// Maps our simplified placement checkboxes to Meta's publisher_platforms +
// per-platform position fields.
function placementFields(selected: PlacementOption[]) {
  const platforms = new Set<string>();
  const facebookPositions = new Set<string>();
  const instagramPositions = new Set<string>();
  for (const p of selected) {
    if (p === "facebook_feed") {
      platforms.add("facebook");
      facebookPositions.add("feed");
    } else if (p === "instagram_feed") {
      platforms.add("instagram");
      instagramPositions.add("stream");
    } else if (p === "facebook_stories") {
      platforms.add("facebook");
      facebookPositions.add("story");
    } else if (p === "instagram_stories") {
      platforms.add("instagram");
      instagramPositions.add("story");
    } else if (p === "facebook_reels") {
      platforms.add("facebook");
      facebookPositions.add("facebook_reels");
    } else if (p === "instagram_reels") {
      platforms.add("instagram");
      instagramPositions.add("reels");
    } else if (p === "marketplace") {
      platforms.add("facebook");
      facebookPositions.add("marketplace");
    } else if (p === "audience_network") {
      platforms.add("audience_network");
    }
  }
  const out: Record<string, unknown> = { publisher_platforms: [...platforms] };
  if (facebookPositions.size > 0) out.facebook_positions = [...facebookPositions];
  if (instagramPositions.size > 0) out.instagram_positions = [...instagramPositions];
  return out;
}

export type AdAssetInput = {
  base64: string;
  type: "image" | "video";
  format: "1:1" | "9:16";
};

export type AdInput = {
  name: string;
  headline: string;
  primaryText: string;
  description: string;
  cta: string;
  assets: AdAssetInput[];
};

export type AdSetInput = {
  name: string;
  locationQuery?: string; // free-text place name, e.g. "Bondi, NSW" — resolved via geo search
  radiusKm?: number; // only used when locationQuery resolves to a city
  countries: string[]; // broad fallback/additional targeting, ISO codes
  ageMin: number;
  ageMax: number;
  gender: Gender;
  interests?: string; // free-text, comma-separated — resolved to interest IDs
  placementMode: PlacementMode;
  manualPlacements?: PlacementOption[];
  ads: AdInput[];
};

export type CampaignInput = {
  campaignName: string;
  objective: MetaObjective;
  budgetType: BudgetType;
  budgetAmount: number; // dollars
  linkUrl: string;
  pixelId?: string;
  conversionEvent?: string;
  adSets: AdSetInput[];
};

export type LaunchResult = {
  campaignId: string;
  adSets: { adSetId: string; adSetName: string; ads: { adId: string; adName: string }[] }[];
  manageUrl: string;
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

async function graphPost(path: string, token: string, body: Record<string, unknown>): Promise<Record<string, unknown>> {
  const url = new URL(`https://graph.facebook.com/${GRAPH_VERSION}${path}`);
  const res = await withTimeout(
    (signal) =>
      fetch(url.toString(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...body, access_token: token }),
        signal,
      }),
    20000
  );
  const json = await res.json();
  if (!res.ok) {
    const message = (json as { error?: { message?: string } }).error?.message ?? JSON.stringify(json);
    throw new Error(`Meta Graph API error: ${message}`);
  }
  return json;
}

async function graphPostForm(path: string, token: string, form: FormData): Promise<Record<string, unknown>> {
  const url = new URL(`https://graph.facebook.com/${GRAPH_VERSION}${path}`);
  form.append("access_token", token);
  const res = await withTimeout((signal) => fetch(url.toString(), { method: "POST", body: form, signal }), 30000);
  const json = await res.json();
  if (!res.ok) {
    const message = (json as { error?: { message?: string } }).error?.message ?? JSON.stringify(json);
    throw new Error(`Meta Graph API error: ${message}`);
  }
  return json;
}

async function graphGet(path: string, token: string, params: Record<string, string>): Promise<Record<string, unknown>> {
  const url = new URL(`https://graph.facebook.com/${GRAPH_VERSION}${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  url.searchParams.set("access_token", token);
  const res = await withTimeout((signal) => fetch(url.toString(), { signal }), 10000);
  const json = await res.json();
  if (!res.ok) {
    const message = (json as { error?: { message?: string } }).error?.message ?? JSON.stringify(json);
    throw new Error(`Meta Graph API error: ${message}`);
  }
  return json;
}

/**
 * Resolves free-text interest names (comma-separated) to Meta interest
 * targeting IDs via the ad interest search endpoint. Best-effort: unmatched
 * names are silently skipped rather than failing the whole request.
 */
async function resolveInterests(names: string, token: string): Promise<{ id: string; name: string }[]> {
  const terms = names.split(",").map((s) => s.trim()).filter(Boolean);
  const resolved: { id: string; name: string }[] = [];
  for (const term of terms) {
    try {
      const res = await graphGet("/search", token, { type: "adinterest", q: term, limit: "1" });
      const data = res.data as { id: string; name: string }[] | undefined;
      if (data && data[0]) resolved.push({ id: data[0].id, name: data[0].name });
    } catch {
      // Skip unresolved interests.
    }
  }
  return resolved;
}

type ResolvedLocation = { kind: "city" | "region" | "country"; key: string } | null;

/**
 * Resolves a free-text place name (e.g. "Bondi, NSW") to a Meta geo-targeting
 * key via the ad geolocation search endpoint. Returns null if nothing
 * matched, in which case the caller should fall back to broad country
 * targeting.
 */
async function resolveLocation(query: string, token: string): Promise<ResolvedLocation> {
  try {
    const res = await graphGet("/search", token, { type: "adgeolocation", q: query, limit: "1" });
    const data = res.data as { key: string; type: string }[] | undefined;
    const first = data?.[0];
    if (!first) return null;
    if (first.type === "city") return { kind: "city", key: first.key };
    if (first.type === "region") return { kind: "region", key: first.key };
    if (first.type === "country") return { kind: "country", key: first.key };
    return null;
  } catch {
    return null;
  }
}

async function buildTargetingSpec(adSet: AdSetInput, token: string): Promise<Record<string, unknown>> {
  const interests = adSet.interests ? await resolveInterests(adSet.interests, token) : [];
  const location = adSet.locationQuery ? await resolveLocation(adSet.locationQuery, token) : null;

  const geoLocations: Record<string, unknown> = {};
  if (location?.kind === "city") {
    geoLocations.cities = adSet.radiusKm
      ? [{ key: location.key, radius: adSet.radiusKm, distance_unit: "kilometer" }]
      : [{ key: location.key }];
  } else if (location?.kind === "region") {
    geoLocations.regions = [{ key: location.key }];
  } else if (location?.kind === "country") {
    geoLocations.countries = [location.key];
  }
  if (adSet.countries.length > 0 && !geoLocations.cities && !geoLocations.regions) {
    geoLocations.countries = [...(geoLocations.countries as string[] | undefined) ?? [], ...adSet.countries];
  }
  if (Object.keys(geoLocations).length === 0) geoLocations.countries = ["AU"];

  const spec: Record<string, unknown> = {
    geo_locations: geoLocations,
    age_min: adSet.ageMin,
    age_max: adSet.ageMax,
  };
  if (adSet.gender === "male") spec.genders = [1];
  if (adSet.gender === "female") spec.genders = [2];
  if (interests.length > 0) spec.flexible_spec = [{ interests: interests.map((i) => ({ id: i.id, name: i.name })) }];

  if (adSet.placementMode === "manual" && adSet.manualPlacements && adSet.manualPlacements.length > 0) {
    Object.assign(spec, placementFields(adSet.manualPlacements));
  }
  // "automatic" placement mode = omit publisher_platforms entirely, which
  // means Advantage+ placements (Meta's own recommended default).

  return spec;
}

async function uploadImage(act: string, token: string, base64: string): Promise<string> {
  const imageRes = await graphPost(`/${act}/adimages`, token, { bytes: base64 });
  const images = imageRes.images as Record<string, { hash: string }> | undefined;
  const hash = images ? Object.values(images)[0]?.hash : undefined;
  if (!hash) throw new Error("Image upload did not return a hash");
  return hash;
}

/**
 * Uploads a video and waits (bounded polling) for it to finish processing,
 * then returns its auto-generated thumbnail URL for use as the ad's
 * thumbnail image.
 */
async function uploadVideo(act: string, token: string, base64: string): Promise<{ videoId: string; thumbnailUrl: string }> {
  const bytes = Buffer.from(base64, "base64");
  const form = new FormData();
  form.append("source", new Blob([bytes]), "video.mp4");
  const videoRes = await graphPostForm(`/${act}/advideos`, token, form);
  const videoId = videoRes.id as string;

  let thumbnailUrl: string | undefined;
  for (let i = 0; i < 10; i++) {
    await new Promise((r) => setTimeout(r, 3000));
    const status = await graphGet(`/${videoId}`, token, { fields: "status" });
    const videoStatus = (status.status as { video_status?: string } | undefined)?.video_status;
    if (videoStatus === "ready") {
      const thumbs = await graphGet(`/${videoId}/thumbnails`, token, {});
      const data = thumbs.data as { uri: string; is_preferred?: boolean }[] | undefined;
      thumbnailUrl = data?.find((t) => t.is_preferred)?.uri ?? data?.[0]?.uri;
      break;
    }
    if (videoStatus === "error") throw new Error(`Video processing failed for upload`);
  }
  if (!thumbnailUrl) throw new Error("Video did not finish processing in time — try activating manually in Ads Manager once ready");

  return { videoId, thumbnailUrl };
}

async function createCreativeForAd(
  act: string,
  token: string,
  pageId: string,
  linkUrl: string,
  ad: AdInput
): Promise<string> {
  const ctaType = CTA_MAP[ad.cta] ?? "LEARN_MORE";
  const video = ad.assets.find((a) => a.type === "video");
  const images = ad.assets.filter((a) => a.type === "image");

  let creativeBody: Record<string, unknown>;

  if (video) {
    // Video ads use a single video via video_data — mixing multiple videos
    // or video+image in one ad isn't supported here; the first video wins.
    const { videoId, thumbnailUrl } = await uploadVideo(act, token, video.base64);
    creativeBody = {
      name: `${ad.name} - Creative`,
      object_story_spec: {
        page_id: pageId,
        video_data: {
          video_id: videoId,
          image_url: thumbnailUrl,
          title: ad.headline,
          message: ad.primaryText,
          link_description: ad.description,
          call_to_action: { type: ctaType, value: { link: linkUrl } },
        },
      },
    };
  } else if (images.length > 1) {
    const hashes = await Promise.all(images.map((img) => uploadImage(act, token, img.base64)));
    creativeBody = {
      name: `${ad.name} - Creative`,
      object_story_spec: { page_id: pageId },
      asset_feed_spec: {
        images: hashes.map((hash) => ({ hash })),
        bodies: [{ text: ad.primaryText }],
        titles: [{ text: ad.headline }],
        descriptions: [{ text: ad.description }],
        link_urls: [{ website_url: linkUrl }],
        call_to_action_types: [ctaType],
        ad_formats: ["AUTOMATIC_FORMAT"],
      },
    };
  } else {
    const hash = images[0] ? await uploadImage(act, token, images[0].base64) : undefined;
    const linkData: Record<string, unknown> = {
      link: linkUrl,
      message: ad.primaryText,
      name: ad.headline,
      description: ad.description,
      call_to_action: { type: ctaType },
    };
    if (hash) linkData.image_hash = hash;
    creativeBody = { name: `${ad.name} - Creative`, object_story_spec: { page_id: pageId, link_data: linkData } };
  }

  const creative = await graphPost(`/${act}/adcreatives`, token, creativeBody);
  return creative.id as string;
}

/**
 * Builds a full Meta campaign → N ad sets → N ads each, all created with
 * status PAUSED. Nothing spends and nothing goes live until a separate,
 * explicit activation step (see activateCampaignTree) is called — this
 * function never activates anything itself.
 *
 * Requires META_ACCESS_TOKEN with the "ads_management" permission (not just
 * "ads_read"), META_AD_ACCOUNT_ID, and META_PAGE_ID env vars.
 */
export async function launchCampaignTree(input: CampaignInput): Promise<LaunchResult> {
  const token = process.env.META_ACCESS_TOKEN;
  const accountId = process.env.META_AD_ACCOUNT_ID;
  const pageId = process.env.META_PAGE_ID;

  const missing = [!token && "META_ACCESS_TOKEN", !accountId && "META_AD_ACCOUNT_ID", !pageId && "META_PAGE_ID"].filter(
    Boolean
  );
  if (missing.length > 0) throw new Error(`Missing env vars: ${missing.join(", ")}`);
  if (input.objective === "OUTCOME_SALES" && (!input.pixelId || !input.conversionEvent)) {
    throw new Error("pixelId and conversionEvent are required for the Sales/Conversion objective");
  }
  if (input.adSets.length === 0) throw new Error("At least one ad set is required");
  for (const as of input.adSets) {
    if (as.ads.length === 0) throw new Error(`Ad set "${as.name}" needs at least one ad`);
  }

  const act = `act_${accountId}`;

  const campaign = await graphPost(`/${act}/campaigns`, token!, {
    name: input.campaignName,
    objective: input.objective,
    status: "PAUSED",
    special_ad_categories: [],
  });
  const campaignId = campaign.id as string;

  const adSetResults: LaunchResult["adSets"] = [];

  for (const adSetInput of input.adSets) {
    const targeting = await buildTargetingSpec(adSetInput, token!);

    const adSetBody: Record<string, unknown> = {
      name: adSetInput.name,
      campaign_id: campaignId,
      billing_event: "IMPRESSIONS",
      optimization_goal: OPTIMIZATION_GOAL[input.objective],
      bid_strategy: "LOWEST_COST_WITHOUT_CAP",
      targeting,
      status: "PAUSED",
    };
    if (input.budgetType === "daily") {
      adSetBody.daily_budget = Math.round((input.budgetAmount * 100) / input.adSets.length);
    } else {
      adSetBody.lifetime_budget = Math.round((input.budgetAmount * 100) / input.adSets.length);
      adSetBody.end_time = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    }
    if (input.objective === "OUTCOME_SALES") {
      adSetBody.promoted_object = { pixel_id: input.pixelId, custom_event_type: input.conversionEvent };
    }

    const adSet = await graphPost(`/${act}/adsets`, token!, adSetBody);
    const adSetId = adSet.id as string;

    const adResults: { adId: string; adName: string }[] = [];
    for (const adInput of adSetInput.ads) {
      const creativeId = await createCreativeForAd(act, token!, pageId!, input.linkUrl, adInput);
      const ad = await graphPost(`/${act}/ads`, token!, {
        name: adInput.name,
        adset_id: adSetId,
        creative: { creative_id: creativeId },
        status: "PAUSED",
      });
      adResults.push({ adId: ad.id as string, adName: adInput.name });
    }

    adSetResults.push({ adSetId, adSetName: adSetInput.name, ads: adResults });
  }

  return {
    campaignId,
    adSets: adSetResults,
    manageUrl: `https://adsmanager.facebook.com/adsmanager/manage/campaigns?act=${accountId}&selected_campaign_ids=${campaignId}`,
  };
}

/**
 * Explicit, separate activation step — flips the whole tree (campaign, every
 * ad set, every ad) to ACTIVE so it actually starts spending. Only call this
 * after the user has reviewed the paused draft and clicked a real
 * confirmation button.
 */
export async function activateCampaignTree(result: LaunchResult): Promise<void> {
  const token = process.env.META_ACCESS_TOKEN;
  if (!token) throw new Error("META_ACCESS_TOKEN is not set in this environment");

  await graphPost(`/${result.campaignId}`, token, { status: "ACTIVE" });
  for (const adSet of result.adSets) {
    await graphPost(`/${adSet.adSetId}`, token, { status: "ACTIVE" });
    for (const ad of adSet.ads) {
      await graphPost(`/${ad.adId}`, token, { status: "ACTIVE" });
    }
  }
}
