import {
  AdAccountSummary,
  AdPlatform,
  BusinessSummary,
  DateRange,
  SocialAccountSummary,
  SocialPlatform,
} from "../types";

/**
 * Provider interfaces. Swap the mock implementations in mock.ts for real
 * ones (Meta Marketing API, Google Ads API, Bite Business API, platform
 * social APIs) without changing any dashboard UI code.
 */
export interface AdsProvider {
  getSummary(platform: AdPlatform, range: DateRange): Promise<AdAccountSummary>;
}

export interface SocialProvider {
  getSummary(platform: SocialPlatform, range: DateRange): Promise<SocialAccountSummary>;
}

export interface BusinessProvider {
  getSummary(range: DateRange): Promise<BusinessSummary>;
}
