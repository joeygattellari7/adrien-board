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
| Google Ads | Mock | — |
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

## Deploy on Vercel

Import this repository in [Vercel](https://vercel.com/new), point it at the
`claude/adrien-dashboard-juliano` branch, and add the environment variables above.
