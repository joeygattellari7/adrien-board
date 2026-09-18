import { DateRange, AdAccountSummary, AdPlatform, BusinessSummary } from "../types";
import { metaAdsProvider } from "./meta";
import { googleAdsProvider } from "./google";
import { biteBusinessProvider } from "./bite";

export async function getAdsSummary(platform: AdPlatform, range: DateRange): Promise<AdAccountSummary> {
  if (platform === "meta") return metaAdsProvider.getSummary(range);
  return googleAdsProvider.getSummary(range);
}

export async function getBusinessSummary(range: DateRange): Promise<BusinessSummary> {
  return biteBusinessProvider.getSummary(range);
}

export { socialProvider } from "./mock";
