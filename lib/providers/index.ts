import { DateRange, AdAccountSummary, AdPlatform } from "../types";
import { metaAdsProvider } from "./meta";
import { googleAdsProvider } from "./google";

export async function getAdsSummary(platform: AdPlatform, range: DateRange): Promise<AdAccountSummary> {
  if (platform === "meta") return metaAdsProvider.getSummary(range);
  return googleAdsProvider.getSummary(range);
}

// Business Data stays on mock until Bite Business (bitebusiness.com — a
// different product from the getbite.com ordering/kiosk API) is confirmed
// to expose a reporting API, and Juliano's account is on a plan that
// includes API access ("The Lot", not the current "Main" plan).
export { businessProvider, socialProvider } from "./mock";
