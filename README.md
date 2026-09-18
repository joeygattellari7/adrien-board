This is the Adrien dashboard for Juliano Pizzaria, a [Next.js](https://nextjs.org) app.

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Password protection

The whole app is gated behind a single shared password (no per-user accounts yet)
via `middleware.ts`. Set `DASHBOARD_PASSWORD` in your environment (and in Vercel for
production) — without it, the app is left open so a fresh unconfigured environment
never accidentally locks out its own developer. The password is checked against a
hash stored in an httpOnly cookie, not sent back and forth on every request.

## Data providers

Each data source lives behind a small provider interface in `lib/providers/`, so live
integrations can be swapped in without touching the dashboard UI. Provider status:

| Source | Status | Env vars |
| --- | --- | --- |
| Meta (Facebook/Instagram) Ads | **Live** (falls back to mock if unconfigured) | `META_ACCESS_TOKEN`, `META_AD_ACCOUNT_ID` |
| Google Ads | Code ready, needs credentials | `GOOGLE_ADS_CLIENT_ID`, `GOOGLE_ADS_CLIENT_SECRET`, `GOOGLE_ADS_REFRESH_TOKEN`, `GOOGLE_ADS_CUSTOMER_ID`, `GOOGLE_ADS_LOGIN_CUSTOMER_ID` (optional), `GOOGLE_ADS_DEVELOPER_TOKEN` (optional, ignored by Google as of Sept 2026) |
| Bite Business | Code ready, needs credentials | `BITE_API_BASE_URL`, `BITE_API_TOKEN`, `BITE_LOCATION_ID` |
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

**Google changed this on September 10, 2026**: developer tokens are sunset — access
level is now tied to the Google Cloud project behind your OAuth client, not a
separate token. `GOOGLE_ADS_DEVELOPER_TOKEN` is optional here (kept only in case
Google reinstates the header check in a future API version).

1. Create a Google Cloud project and enable the **Google Ads API** on it
   (APIs & Services → Library → search "Google Ads API" → Enable). This gives the
   project **Test access** by default, which only works against test accounts.
2. From that same project's **Google Ads API Overview page** in Cloud Console,
   apply for **Basic access** (needed to query Juliano Pizzaria's real account) —
   Google now gates this behind brand verification.
3. Create an **OAuth 2.0 Client ID** (type: Web application) on that project, with
   `https://developers.google.com/oauthplayground` as an authorized redirect URI.
4. Generate a **refresh token** using
   [Google's OAuth Playground](https://developers.google.com/oauthplayground):
   gear icon → "Use your own OAuth credentials" → paste Client ID/Secret → authorize
   the `https://www.googleapis.com/auth/adwords` scope → exchange the code.
5. Find the **customer ID** (the number shown top-right in Google Ads, no dashes)
   for Juliano Pizzaria's account. If it's managed under an agency/MCC account
   (the developer token application itself is applied from the MCC), also set
   `GOOGLE_ADS_LOGIN_CUSTOMER_ID` to the MCC's customer ID.
6. Set `GOOGLE_ADS_CLIENT_ID`, `GOOGLE_ADS_CLIENT_SECRET`, `GOOGLE_ADS_REFRESH_TOKEN`,
   `GOOGLE_ADS_CUSTOMER_ID` (and optionally `GOOGLE_ADS_LOGIN_CUSTOMER_ID`) in Vercel.
7. Without them, `/api/ads` transparently serves mock data for Google, same as Meta
   — the card's badge and an inline message name exactly which env var is missing.

### Bite Business setup

Bite's public API docs (`documentation.getbite.com`) are for the customer-facing
ordering API — the endpoint we use, `GET /v2/reporting/orders/day/{date}`, needs a
**Reporting-scoped API token** that isn't self-serve like Meta/Google's OAuth flows.

1. Contact Bite's support or your account rep to request an API token with the
   **"Reporting"** scope for Juliano Pizzaria's location, and ask for the
   **production API base URL** (not published in the public docs).
2. Find the **location ID** for Juliano Pizzaria (Bite support can confirm this, or
   it may be visible in the Bite Admin portal).
3. Set `BITE_API_BASE_URL`, `BITE_API_TOKEN`, and `BITE_LOCATION_ID` in Vercel.
4. Without them, `/api/business` transparently serves mock data, same pattern as
   Meta/Google — the badge and an inline message name exactly which env var is
   missing.

**Note on accuracy:** the Reporting API returns one day of orders at a time, with
no all-time customer history. "New members" and "returning member rate" are
approximated from repeat orders *within the selected date range* only, not lifetime
— a guest who ordered once last month and once this month reads as two different
"new" guests. Total sales, orders, average order value, and top items are exact.

## Deploy on Vercel

Import this repository in [Vercel](https://vercel.com/new), point it at the
`claude/adrien-dashboard-juliano` branch, and add the environment variables above.
