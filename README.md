This is the Adrien dashboard for Juliano Pizzaria, a [Next.js](https://nextjs.org) app.

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Data providers

Each data source lives behind a small provider interface in `lib/providers/`, so live
integrations can be swapped in without touching the dashboard UI. Provider status:

| Source | Status | Env vars |
| --- | --- | --- |
| Meta (Facebook/Instagram) Ads | **Live** (falls back to mock if unconfigured) | `META_ACCESS_TOKEN`, `META_AD_ACCOUNT_ID` |
| Google Ads | Code ready, needs credentials | `GOOGLE_ADS_DEVELOPER_TOKEN`, `GOOGLE_ADS_CLIENT_ID`, `GOOGLE_ADS_CLIENT_SECRET`, `GOOGLE_ADS_REFRESH_TOKEN`, `GOOGLE_ADS_CUSTOMER_ID`, `GOOGLE_ADS_LOGIN_CUSTOMER_ID` (optional) |
| Bite Business | Mock | — |
| Social (Facebook/Instagram/TikTok/YouTube) | Mock | — |

### Meta Ads setup

1. Create a Meta app with Marketing API access and generate a long-lived access token
   with `ads_read` permission for the Juliano Pizzaria ad account.
2. Set `META_ACCESS_TOKEN` in your environment (and in Vercel Project Settings →
   Environment Variables for production).
3. Optionally set `META_AD_ACCOUNT_ID` — defaults to Juliano Pizzaria's ad account
   (`937731679434253`).
4. Without a token, `/api/ads` transparently serves mock data for Meta so the app
   never breaks in an unconfigured environment — each ad platform card shows a
   "Live data" or "Mock data" badge so it's clear which is which.

**Note:** Juliano Pizzaria's Meta ad account currently has no purchase/conversion
tracking configured (campaigns are optimizing for reach, not purchases), so revenue,
ROAS, conversions, and CPA show as "Not tracked" until a pixel or Conversions API
event is set up and campaigns switch to a purchase objective. Spend, impressions,
clicks, reach, CTR, and CPC are live today.

### Google Ads setup

Google Ads requires more setup than Meta — a developer token plus a full OAuth
client, not just a single long-lived token:

1. Apply for a **developer token** in the Google Ads API Center (under the manager
   account that has access to Juliano Pizzaria's Google Ads account). Basic access
   is enough for read-only reporting.
2. Create an **OAuth 2.0 Client ID** (type: Desktop app or Web app) in
   [Google Cloud Console](https://console.cloud.google.com/apis/credentials), and
   enable the Google Ads API for that project.
3. Generate a **refresh token** for that OAuth client authorized against the Google
   account that has access to the Ads account (Google's
   [OAuth2 quickstart](https://developers.google.com/google-ads/api/docs/get-started/oauth-cloud-project)
   walks through this — it's a one-time browser consent flow).
4. Find the **customer ID** (the 10-digit number in Google Ads, no dashes) for
   Juliano Pizzaria's account. If it's managed under an agency/MCC account, also set
   `GOOGLE_ADS_LOGIN_CUSTOMER_ID` to the MCC's customer ID.
5. Set all five (six with login customer ID) as env vars in Vercel.
6. Without them, `/api/ads` transparently serves mock data for Google, same as Meta
   — the card's badge and an inline message name exactly which env var is missing.

## Deploy on Vercel

Import this repository in [Vercel](https://vercel.com/new), point it at the
`claude/adrien-dashboard-juliano` branch, and add the environment variables above.
