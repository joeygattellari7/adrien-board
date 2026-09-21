const API_VERSION = "v23";

export type GoogleCampaignType = "SEARCH" | "DISPLAY" | "PERFORMANCE_MAX" | "VIDEO";

export type GoogleMatchType = "BROAD" | "PHRASE" | "EXACT";
export type GoogleKeyword = { text: string; matchType: GoogleMatchType };

export type GoogleImageAssetInput = { base64: string };

export type GoogleSitelink = { text: string; description1?: string; description2?: string; finalUrl: string };
export type GoogleStructuredSnippet = { header: string; values: string[] };

// Campaign-level "Assets" (Google's current name for what used to be called
// ad extensions) — sitelinks, callouts, and structured snippets all attach
// to the whole campaign and can show under any ad in it.
export type GoogleCampaignAssets = {
  sitelinks?: GoogleSitelink[];
  callouts?: string[];
  structuredSnippets?: GoogleStructuredSnippet[];
};

export type GoogleAdGroupInput = {
  name: string;
  keywords: GoogleKeyword[]; // Search only
  headlines: string[]; // <=30 chars each; Search/Display/PMax need >=3
  descriptions: string[]; // <=90 chars each; needs >=2
  images?: GoogleImageAssetInput[]; // Display / Performance Max
  videoId?: string; // YouTube video ID (or full URL — parsed) — Video campaigns only
  callToAction?: string; // Video campaigns only, e.g. "Learn More", "Shop Now"
};

export type GoogleCampaignInput = {
  campaignName: string;
  campaignType: GoogleCampaignType;
  dailyBudget: number; // dollars
  finalUrl: string;
  adGroups: GoogleAdGroupInput[];
  assets?: GoogleCampaignAssets;
};

export type GoogleLaunchResult = {
  campaignResourceName: string;
  campaignId: string;
  campaignType: GoogleCampaignType;
  adGroups: { resourceName: string; name: string; adResourceName?: string }[];
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

async function getAccessToken(clientId: string, clientSecret: string, refreshToken: string): Promise<string> {
  const res = await withTimeout(
    (signal) =>
      fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          refresh_token: refreshToken,
          grant_type: "refresh_token",
        }),
        signal,
      }),
    8000
  );
  const json = await res.json();
  if (!res.ok || !json.access_token) {
    throw new Error(`Google OAuth token refresh failed: ${json.error_description ?? JSON.stringify(json)}`);
  }
  return json.access_token as string;
}

type Auth = {
  customerId: string;
  loginCustomerId?: string;
  developerToken?: string;
  accessToken: string;
};

async function requireAuth(): Promise<Auth> {
  const clientId = process.env.GOOGLE_ADS_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_ADS_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_ADS_REFRESH_TOKEN;
  const customerId = process.env.GOOGLE_ADS_CUSTOMER_ID;
  const loginCustomerId = process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID;
  const developerToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN;

  const missing = [
    !clientId && "GOOGLE_ADS_CLIENT_ID",
    !clientSecret && "GOOGLE_ADS_CLIENT_SECRET",
    !refreshToken && "GOOGLE_ADS_REFRESH_TOKEN",
    !customerId && "GOOGLE_ADS_CUSTOMER_ID",
  ].filter(Boolean);
  if (missing.length > 0) throw new Error(`Missing env vars: ${missing.join(", ")}`);

  const accessToken = await getAccessToken(clientId!, clientSecret!, refreshToken!);
  return { customerId: customerId!, loginCustomerId, developerToken, accessToken };
}

async function mutate(
  resourcePath: string,
  auth: Auth,
  operations: Record<string, unknown>[]
): Promise<{ results: { resourceName: string }[] }> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${auth.accessToken}`,
    "Content-Type": "application/json",
  };
  if (auth.developerToken) headers["developer-token"] = auth.developerToken;
  if (auth.loginCustomerId) headers["login-customer-id"] = auth.loginCustomerId.replace(/-/g, "");

  const res = await withTimeout(
    (signal) =>
      fetch(
        `https://googleads.googleapis.com/${API_VERSION}/customers/${auth.customerId.replace(/-/g, "")}/${resourcePath}:mutate`,
        { method: "POST", headers, body: JSON.stringify({ operations }), signal }
      ),
    20000
  );
  const json = await res.json();
  if (!res.ok) {
    const message = json.error?.message ?? JSON.stringify(json);
    throw new Error(`Google Ads API error (${resourcePath}): ${message}`);
  }
  return json;
}

async function uploadImageAsset(auth: Auth, base64: string): Promise<string> {
  const res = await mutate("assets", auth, [{ create: { type: "IMAGE", imageAsset: { data: base64 } } }]);
  return res.results[0].resourceName;
}

async function uploadTextAsset(auth: Auth, text: string): Promise<string> {
  const res = await mutate("assets", auth, [{ create: { type: "TEXT", textAsset: { text } } }]);
  return res.results[0].resourceName;
}

function extractYoutubeId(input: string): string {
  const match = input.match(/(?:youtu\.be\/|v=|\/shorts\/)([A-Za-z0-9_-]{6,})/);
  return match ? match[1] : input.trim();
}

async function uploadYoutubeVideoAsset(auth: Auth, videoIdOrUrl: string): Promise<string> {
  const youtubeVideoId = extractYoutubeId(videoIdOrUrl);
  const res = await mutate("assets", auth, [{ create: { type: "YOUTUBE_VIDEO", youtubeVideoAsset: { youtubeVideoId } } }]);
  return res.results[0].resourceName;
}

/**
 * Links campaign-level "Assets" (Google's current name for sitelinks,
 * callouts, and structured snippets — what used to be called ad
 * extensions). These attach to the whole campaign and can surface under any
 * ad group's ads within it.
 */
async function buildCampaignAssets(auth: Auth, campaignResourceName: string, assets: GoogleCampaignAssets): Promise<void> {
  const ops: Record<string, unknown>[] = [];

  for (const sitelink of assets.sitelinks ?? []) {
    const assetRes = await mutate("assets", auth, [
      {
        create: {
          finalUrls: [sitelink.finalUrl],
          sitelinkAsset: {
            linkText: sitelink.text,
            description1: sitelink.description1 || undefined,
            description2: sitelink.description2 || undefined,
          },
        },
      },
    ]);
    ops.push({ create: { campaign: campaignResourceName, asset: assetRes.results[0].resourceName, fieldType: "SITELINK" } });
  }

  for (const callout of assets.callouts ?? []) {
    const assetRes = await mutate("assets", auth, [{ create: { calloutAsset: { calloutText: callout } } }]);
    ops.push({ create: { campaign: campaignResourceName, asset: assetRes.results[0].resourceName, fieldType: "CALLOUT" } });
  }

  for (const snippet of assets.structuredSnippets ?? []) {
    const assetRes = await mutate("assets", auth, [
      { create: { structuredSnippetAsset: { header: snippet.header, values: snippet.values } } },
    ]);
    ops.push({ create: { campaign: campaignResourceName, asset: assetRes.results[0].resourceName, fieldType: "STRUCTURED_SNIPPET" } });
  }

  if (ops.length > 0) await mutate("campaignAssets", auth, ops);
}

/**
 * Performance Max campaigns are asset-group based rather than
 * ad-group-based: text and image assets are uploaded individually, then
 * linked to the asset group with a fieldType tag (HEADLINE, DESCRIPTION,
 * MARKETING_IMAGE, etc). This is a best-effort approximation of Google's
 * asset requirements (Google recommends 3+ headlines, 2+ descriptions, at
 * least one square image) — Performance Max may need minor adjustment in
 * the Google Ads UI before it clears review, same as any first draft.
 */
async function buildPerformanceMaxAssetGroup(
  auth: Auth,
  assetGroupResourceName: string,
  adGroup: GoogleAdGroupInput
): Promise<void> {
  const ops: Record<string, unknown>[] = [];

  for (const h of adGroup.headlines) {
    const resourceName = await uploadTextAsset(auth, h);
    ops.push({ create: { assetGroup: assetGroupResourceName, asset: resourceName, fieldType: "HEADLINE" } });
  }
  for (const d of adGroup.descriptions) {
    const resourceName = await uploadTextAsset(auth, d);
    ops.push({ create: { assetGroup: assetGroupResourceName, asset: resourceName, fieldType: "DESCRIPTION" } });
  }
  if (adGroup.headlines[0]) {
    const longHeadline = await uploadTextAsset(auth, adGroup.headlines[0]);
    ops.push({ create: { assetGroup: assetGroupResourceName, asset: longHeadline, fieldType: "LONG_HEADLINE" } });
  }
  const businessName = await uploadTextAsset(auth, "Juliano Pizzaria");
  ops.push({ create: { assetGroup: assetGroupResourceName, asset: businessName, fieldType: "BUSINESS_NAME" } });

  for (const img of adGroup.images ?? []) {
    const resourceName = await uploadImageAsset(auth, img.base64);
    ops.push({ create: { assetGroup: assetGroupResourceName, asset: resourceName, fieldType: "MARKETING_IMAGE" } });
    ops.push({ create: { assetGroup: assetGroupResourceName, asset: resourceName, fieldType: "SQUARE_MARKETING_IMAGE" } });
  }

  if (ops.length > 0) await mutate("assetGroupAssets", auth, ops);
}

/**
 * Builds a full Google Ads campaign (Search, Display, or Performance Max)
 * with one or more ad groups (Search/Display) or asset groups (Performance
 * Max), all created PAUSED. Nothing serves and nothing spends until a
 * separate, explicit activation step (see activateGoogleCampaignTree).
 *
 * Requires GOOGLE_ADS_CLIENT_ID, GOOGLE_ADS_CLIENT_SECRET,
 * GOOGLE_ADS_REFRESH_TOKEN, GOOGLE_ADS_CUSTOMER_ID (same credentials used
 * for the read-only reporting integration — no extra setup needed there,
 * but the OAuth scope must include https://www.googleapis.com/auth/adwords
 * with write access, which the standard "adwords" scope already grants).
 */
export async function launchGoogleCampaignTree(input: GoogleCampaignInput): Promise<GoogleLaunchResult> {
  if (input.adGroups.length === 0) throw new Error("At least one ad group is required");
  for (const ag of input.adGroups) {
    if (input.campaignType === "VIDEO") {
      if (!ag.videoId) throw new Error(`Ad group "${ag.name}" needs a YouTube video`);
      continue;
    }
    if (input.campaignType === "SEARCH" && ag.headlines.length < 3) {
      throw new Error(`Ad group "${ag.name}" needs at least 3 headlines`);
    }
    if (ag.descriptions.length < 2) throw new Error(`Ad group "${ag.name}" needs at least 2 descriptions`);
    if ((input.campaignType === "DISPLAY" || input.campaignType === "PERFORMANCE_MAX") && (!ag.images || ag.images.length === 0)) {
      throw new Error(`Ad group "${ag.name}" needs at least one image for ${input.campaignType} campaigns`);
    }
  }

  const auth = await requireAuth();

  const budgetRes = await mutate("campaignBudgets", auth, [
    {
      create: {
        name: `${input.campaignName} Budget`,
        amountMicros: String(Math.round(input.dailyBudget * 1_000_000)),
        deliveryMethod: "STANDARD",
      },
    },
  ]);
  const budgetResourceName = budgetRes.results[0].resourceName;

  const campaignBody: Record<string, unknown> = {
    name: input.campaignName,
    advertisingChannelType: input.campaignType,
    status: "PAUSED",
    campaignBudget: budgetResourceName,
  };
  if (input.campaignType === "SEARCH") {
    campaignBody.networkSettings = {
      targetGoogleSearch: true,
      targetSearchNetwork: true,
      targetContentNetwork: false,
      targetPartnerSearchNetwork: false,
    };
    campaignBody.manualCpc = {};
  } else if (input.campaignType === "DISPLAY") {
    campaignBody.maximizeConversions = {};
  } else if (input.campaignType === "VIDEO") {
    campaignBody.manualCpv = {};
  } else {
    campaignBody.maximizeConversionValue = {};
    campaignBody.urlExpansionOptOut = false;
  }

  const campaignRes = await mutate("campaigns", auth, [{ create: campaignBody }]);
  const campaignResourceName = campaignRes.results[0].resourceName;
  const campaignId = campaignResourceName.split("/").pop()!;

  if (input.assets) await buildCampaignAssets(auth, campaignResourceName, input.assets);

  const adGroupResults: GoogleLaunchResult["adGroups"] = [];

  if (input.campaignType === "PERFORMANCE_MAX") {
    for (const ag of input.adGroups) {
      const assetGroupRes = await mutate("assetGroups", auth, [
        { create: { name: ag.name, campaign: campaignResourceName, finalUrls: [input.finalUrl], status: "PAUSED" } },
      ]);
      const assetGroupResourceName = assetGroupRes.results[0].resourceName;
      await buildPerformanceMaxAssetGroup(auth, assetGroupResourceName, ag);
      adGroupResults.push({ resourceName: assetGroupResourceName, name: ag.name });
    }
  } else {
    for (const ag of input.adGroups) {
      const adGroupType =
        input.campaignType === "SEARCH" ? "SEARCH_STANDARD" : input.campaignType === "VIDEO" ? "VIDEO_TRUE_VIEW_IN_STREAM" : "DISPLAY_STANDARD";
      const adGroupRes = await mutate("adGroups", auth, [
        {
          create: {
            name: ag.name,
            campaign: campaignResourceName,
            status: "ENABLED",
            type: adGroupType,
            cpcBidMicros: input.campaignType === "VIDEO" ? undefined : "1000000",
          },
        },
      ]);
      const adGroupResourceName = adGroupRes.results[0].resourceName;

      if (input.campaignType === "SEARCH" && ag.keywords.length > 0) {
        await mutate(
          "adGroupCriteria",
          auth,
          ag.keywords.map((k) => ({
            create: { adGroup: adGroupResourceName, status: "ENABLED", keyword: { text: k.text, matchType: k.matchType } },
          }))
        );
      }

      let adRes;
      if (input.campaignType === "VIDEO") {
        const videoResourceName = await uploadYoutubeVideoAsset(auth, ag.videoId!);
        adRes = await mutate("adGroupAds", auth, [
          {
            create: {
              adGroup: adGroupResourceName,
              status: "PAUSED",
              ad: {
                finalUrls: [input.finalUrl],
                videoResponsiveAd: {
                  headlines: ag.headlines.filter(Boolean).map((h) => ({ text: h })),
                  longHeadlines: ag.headlines[0] ? [{ text: ag.headlines[0] }] : [],
                  descriptions: ag.descriptions.filter(Boolean).map((d) => ({ text: d })),
                  callToActions: [{ text: ag.callToAction || "Learn More" }],
                  videos: [{ asset: videoResourceName }],
                },
              },
            },
          },
        ]);
      } else if (input.campaignType === "SEARCH") {
        adRes = await mutate("adGroupAds", auth, [
          {
            create: {
              adGroup: adGroupResourceName,
              status: "PAUSED",
              ad: {
                finalUrls: [input.finalUrl],
                responsiveSearchAd: {
                  headlines: ag.headlines.map((h) => ({ text: h })),
                  descriptions: ag.descriptions.map((d) => ({ text: d })),
                },
              },
            },
          },
        ]);
      } else {
        const imageResourceNames = await Promise.all((ag.images ?? []).map((img) => uploadImageAsset(auth, img.base64)));
        adRes = await mutate("adGroupAds", auth, [
          {
            create: {
              adGroup: adGroupResourceName,
              status: "PAUSED",
              ad: {
                finalUrls: [input.finalUrl],
                responsiveDisplayAd: {
                  headlines: ag.headlines.map((h) => ({ text: h })),
                  longHeadline: { text: ag.headlines[0] ?? ag.name },
                  descriptions: ag.descriptions.map((d) => ({ text: d })),
                  marketingImages: imageResourceNames.map((r) => ({ asset: r })),
                  squareMarketingImages: imageResourceNames.map((r) => ({ asset: r })),
                  businessName: "Juliano Pizzaria",
                },
              },
            },
          },
        ]);
      }

      adGroupResults.push({ resourceName: adGroupResourceName, name: ag.name, adResourceName: adRes.results[0].resourceName });
    }
  }

  return {
    campaignResourceName,
    campaignId,
    campaignType: input.campaignType,
    adGroups: adGroupResults,
    manageUrl: `https://ads.google.com/aw/campaigns?campaignId=${campaignId}`,
  };
}

/**
 * Explicit, separate activation step — enables the campaign plus every ad
 * group/asset group and ad so it actually starts serving. Only call this
 * after the user has reviewed the paused draft and clicked a real
 * confirmation button.
 */
export async function activateGoogleCampaignTree(result: GoogleLaunchResult): Promise<void> {
  const auth = await requireAuth();

  await mutate("campaigns", auth, [
    { update: { resourceName: result.campaignResourceName, status: "ENABLED" }, updateMask: "status" },
  ]);

  if (result.campaignType === "PERFORMANCE_MAX") {
    await mutate(
      "assetGroups",
      auth,
      result.adGroups.map((ag) => ({ update: { resourceName: ag.resourceName, status: "ENABLED" }, updateMask: "status" }))
    );
  } else {
    const withAds = result.adGroups.filter((ag) => ag.adResourceName);
    if (withAds.length > 0) {
      await mutate(
        "adGroupAds",
        auth,
        withAds.map((ag) => ({ update: { resourceName: ag.adResourceName, status: "ENABLED" }, updateMask: "status" }))
      );
    }
  }
}
