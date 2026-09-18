const GRAPH_VERSION = "v21.0";

export type MetaObjective = "OUTCOME_TRAFFIC" | "OUTCOME_ENGAGEMENT" | "OUTCOME_AWARENESS";

const OPTIMIZATION_GOAL: Record<MetaObjective, string> = {
  OUTCOME_TRAFFIC: "LINK_CLICKS",
  OUTCOME_ENGAGEMENT: "POST_ENGAGEMENT",
  OUTCOME_AWARENESS: "REACH",
};

export type LaunchMetaCampaignInput = {
  campaignName: string;
  objective: MetaObjective;
  dailyBudget: number; // dollars
  headline: string;
  primaryText: string;
  description: string;
  cta: string;
  linkUrl: string;
  imageBase64?: string; // raw base64, no data: prefix
  countries?: string[]; // ISO country codes, default ["AU"]
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

  const act = `act_${accountId}`;

  const campaign = await graphPost(`/${act}/campaigns`, token!, {
    name: input.campaignName,
    objective: input.objective,
    status: "PAUSED",
    special_ad_categories: [],
  });
  const campaignId = campaign.id as string;

  let imageHash: string | undefined;
  if (input.imageBase64) {
    const imageRes = await graphPost(`/${act}/adimages`, token!, { bytes: input.imageBase64 });
    const images = imageRes.images as Record<string, { hash: string }> | undefined;
    imageHash = images ? Object.values(images)[0]?.hash : undefined;
  }

  const adSet = await graphPost(`/${act}/adsets`, token!, {
    name: `${input.campaignName} - Ad Set`,
    campaign_id: campaignId,
    daily_budget: Math.round(input.dailyBudget * 100),
    billing_event: "IMPRESSIONS",
    optimization_goal: OPTIMIZATION_GOAL[input.objective],
    bid_strategy: "LOWEST_COST_WITHOUT_CAP",
    targeting: {
      geo_locations: { countries: input.countries ?? ["AU"] },
    },
    status: "PAUSED",
  });
  const adSetId = adSet.id as string;

  const linkData: Record<string, unknown> = {
    link: input.linkUrl,
    message: input.primaryText,
    name: input.headline,
    description: input.description,
    call_to_action: { type: CTA_MAP[input.cta] ?? "LEARN_MORE" },
  };
  if (imageHash) linkData.image_hash = imageHash;

  const creative = await graphPost(`/${act}/adcreatives`, token!, {
    name: `${input.campaignName} - Creative`,
    object_story_spec: {
      page_id: pageId,
      link_data: linkData,
    },
  });
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
