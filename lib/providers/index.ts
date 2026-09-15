import { DateRange, AdAccountSummary, AdPlatform } from "../types";
import { adsProvider as mockAdsProvider } from "./mock";
import { metaAdsProvider } from "./meta";

export async function getAdsSummary(platform: AdPlatform, range: DateRange): Promise<AdAccountSummary> {
  if (platform === "meta") return metaAdsProvider.getSummary(range);
  // Google Ads not wired up yet — falls back to mock.
  return mockAdsProvider.getSummary(platform, range);
}

export { businessProvider, socialProvider } from "./mock";
