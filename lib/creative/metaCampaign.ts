const GRAPH_VERSION = "v21.0";

export type MetaObjective = "OUTCOME_TRAFFIC" | "OUTCOME_ENGAGEMENT" | "OUTCOME_AWARENESS" | "OUTCOME_SALES";

const OPTIMIZATION_GOAL: Record<MetaObjective, string> = {
  OUTCOME_TRAFFIC: "LINK_CLICKS",
  OUTCOME_ENGAGEMENT: "POST_ENGAGEMENT",
  OUTCOME_AWARENESS: "REACH",
  OUTCOME_SALES: "OFFSITE_CONVERSIONS",
};

export type Gender = "all" | "male" | "female";

export type Targeting = {
  countries: string[]; // ISO country codes
  ageMin: number;
  ageMax: number;
  gender: Gender;
  interests?: string; // free-text, comma-separated interest names — resolved to IDs via Graph search
};

export type LaunchMetaCampaignInput = {
  campaignName: string;
  adSetName: string;
  objective: MetaObjective;
  dailyBudget: number; // dollars
  headline: string;
  primaryText: string;
  description: string;
  cta: string;
  linkUrl: string;
  targeting: Targeting;
  // Conversion objective only
  pixelId?: string;
  conversionEvent?: string;
  // Up to two images: a 1:1 square and a 9:16 vertical. Both are optional;
  // when both are given, Meta auto-selects the right one per placement via
  // asset_feed_spec (documented mechanism for this exact use case).
  squareImageBase64?: string;
  verticalImageBase64?: string;
};

export type LaunchMetaCampaignResult = {
  campaignId: string;
  adSetId: string;
  creativeId: string;
  adId: string;
  manageUrl: string;
};

const CTA_MAP: Record<string, string> = {
  "Order Now": "ORDER_NOW",
  "Learn More": "LEARN_MORE",
  "Shop Now": "SHOP_NOW",
  "Get Offer": "GET_OFFER",
  "Sign Up": "SIGN_UP",
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
    15000
  );
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
 * names are silently skipped rather than failing the whole request, since
 * interest targeting is additive, not required.
 */
async function resolveInterests(names: string, token: string): Promise<{ id: string; name: string }[]> {
  const terms = names
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const resolved: { id: string; name: string }[] = [];
  for (const term of terms) {
    try {
      const res = await graphGet("/search", token, { type: "adinterest", q: term, limit: "1" });
      const data = res.data as { id: string; name: string }[] | undefined;
      if (data && data[0]) resolved.push({ id: data[0].id, name: data[0].name });
    } catch {
      // Skip unresolved interests rather than failing the whole launch.
    }
  }
  return resolved;
}

function buildTargetingSpec(t: Targeting, interests: { id: string; name: string }[]) {
  const spec: Record<string, unknown> = {
    geo_locations: { countries: t.countries },
    age_min: t.ageMin,
    age_max: t.ageMax,
  };
  if (t.gender === "male") spec.genders = [1];
  if (t.gender === "female") spec.genders = [2];
  if (interests.length > 0) {
    spec.flexible_spec = [{ interests: interests.map((i) => ({ id: i.id, name: i.name })) }];
  }
  return spec;
}

async function uploadImage(act: string, token: string, base64: string): Promise<string | undefined> {
  const imageRes = await graphPost(`/${act}/adimages`, token, { bytes: base64 });
  const images = imageRes.images as Record<string, { hash: string }> | undefined;
  return images ? Object.values(images)[0]?.hash : undefined;
}

/**
 * Builds a full Meta campaign → ad set → creative → ad, all created with
 * status PAUSED. Nothing spends and nothing goes live until a separate,
 * explicit activation step (see activateMetaAd) is called — this function
 * never activates anything itself.
 *
 * Requires META_ACCESS_TOKEN with the "ads_management" permission (not
 * just "ads_read"), META_AD_ACCOUNT_ID, and META_PAGE_ID env vars.
 */
export async function launchMetaCampaign(input: LaunchMetaCampaignInput): Promise<LaunchMetaCampaignResult> {
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

  const act = `act_${accountId}`;

  const campaign = await graphPost(`/${act}/campaigns`, token!, {
    name: input.campaignName,
    objective: input.objective,
    status: "PAUSED",
    special_ad_categories: [],
  });
  const campaignId = campaign.id as string;

  const interests = input.targeting.interests ? await resolveInterests(input.targeting.interests, token!) : [];

  const adSetBody: Record<string, unknown> = {
    name: input.adSetName,
    campaign_id: campaignId,
    daily_budget: Math.round(input.dailyBudget * 100),
    billing_event: "IMPRESSIONS",
    optimization_goal: OPTIMIZATION_GOAL[input.objective],
    bid_strategy: "LOWEST_COST_WITHOUT_CAP",
    targeting: buildTargetingSpec(input.targeting, interests),
    status: "PAUSED",
  };
  if (input.objective === "OUTCOME_SALES") {
    adSetBody.promoted_object = { pixel_id: input.pixelId, custom_event_type: input.conversionEvent };
  }

  const adSet = await graphPost(`/${act}/adsets`, token!, adSetBody);
  const adSetId = adSet.id as string;

  const squareHash = input.squareImageBase64 ? await uploadImage(act, token!, input.squareImageBase64) : undefined;
  const verticalHash = input.verticalImageBase64 ? await uploadImage(act, token!, input.verticalImageBase64) : undefined;
  const ctaType = CTA_MAP[input.cta] ?? "LEARN_MORE";

  let creativeBody: Record<string, unknown>;
  if (squareHash && verticalHash) {
    // Both formats supplied — let Meta pick the right one per placement.
    creativeBody = {
      name: `${input.campaignName} - Creative`,
      object_story_spec: { page_id: pageId },
      asset_feed_spec: {
        images: [{ hash: squareHash }, { hash: verticalHash }],
        bodies: [{ text: input.primaryText }],
        titles: [{ text: input.headline }],
        descriptions: [{ text: input.description }],
        link_urls: [{ website_url: input.linkUrl }],
        call_to_action_types: [ctaType],
        ad_formats: ["AUTOMATIC_FORMAT"],
      },
    };
  } else {
    const linkData: Record<string, unknown> = {
      link: input.linkUrl,
      message: input.primaryText,
      name: input.headline,
      description: input.description,
      call_to_action: { type: ctaType },
    };
    if (squareHash ?? verticalHash) linkData.image_hash = squareHash ?? verticalHash;
    creativeBody = {
      name: `${input.campaignName} - Creative`,
      object_story_spec: { page_id: pageId, link_data: linkData },
    };
  }

  const creative = await graphPost(`/${act}/adcreatives`, token!, creativeBody);
  const creativeId = creative.id as string;

  const ad = await graphPost(`/${act}/ads`, token!, {
    name: `${input.campaignName} - Ad`,
    adset_id: adSetId,
    creative: { creative_id: creativeId },
    status: "PAUSED",
  });
  const adId = ad.id as string;

  return {
    campaignId,
    adSetId,
    creativeId,
    adId,
    manageUrl: `https://adsmanager.facebook.com/adsmanager/manage/campaigns?act=${accountId}&selected_campaign_ids=${campaignId}`,
  };
}

/**
 * Explicit, separate activation step — flips the ad (and its ad set) to
 * ACTIVE so it actually starts spending. Only call this after the user has
 * reviewed the paused draft and clicked a real confirmation button.
 */
export async function activateMetaAd(adId: string, adSetId: string): Promise<void> {
  const token = process.env.META_ACCESS_TOKEN;
  if (!token) throw new Error("META_ACCESS_TOKEN is not set in this environment");

  await graphPost(`/${adSetId}`, token, { status: "ACTIVE" });
  await graphPost(`/${adId}`, token, { status: "ACTIVE" });
}
