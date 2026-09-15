import { DateRange, AdAccountSummary, AdPlatform } from "../types";
import { metaAdsProvider } from "./meta";
import { googleAdsProvider } from "./google";

export async function getAdsSummary(platform: AdPlatform, range: DateRange): Promise<AdAccountSummary> {
  if (platform === "meta") return metaAdsProvider.getSummary(range);
  return googleAdsProvider.getSummary(range);
}

export { businessProvider, socialProvider } from "./mock";
