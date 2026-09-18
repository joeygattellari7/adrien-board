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
| Bite Business | Blocked — see below | — |
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

### Bite Business setup — currently blocked

`documentation.getbite.com` documents a *different* product (a kiosk/online-ordering
platform) from the one Juliano Pizzaria actually uses (`bitebusiness.com`, a
delivery-management platform — own drivers or Uber Direct). That doc's API isn't
applicable here.

More importantly: Bite Business's own pricing page shows **API access is only
included on "The Lot" plan** ($99/week); Juliano's account is on **"Main"**
($59/week), which doesn't include API access at all. So this integration is blocked
regardless of which docs are correct, until either:

1. The account is upgraded to "The Lot," and Bite Business support is asked for
   API docs/credentials for that plan tier, or
2. Bite Business offers another way to get sales/order data out (a CSV export,
   webhook, or similar) that doesn't require the API-access plan feature.

Business Data stays on mock data until one of those is resolved.

## Creative Factory

A separate tab (`/creative-factory`) with two pieces:

1. **Ad copy generator** (`/api/creative/copy`) — writes headline/primary text/
   description/CTA variations for a product/offer. Uses the Anthropic API for
   genuinely varied copy when `ANTHROPIC_API_KEY` is set; otherwise falls back to
   fixed templates so it always returns something usable.
2. **Meta campaign builder & launcher** (`/api/creative/launch`,
   `/api/creative/activate`) — builds a full campaign → ad set → ad creative → ad
   directly via the Graph API.

**Safety design — always creates paused, never auto-activates:** every campaign,
ad set, and ad is created with `status: PAUSED`. Nothing spends money on creation.
The UI shows the draft with a link to review it in Meta Ads Manager, and a
separate, explicit "Activate" button that's the *only* thing that flips it live —
that action is never taken automatically.

**Setup**: needs a `META_ACCESS_TOKEN` with **`ads_management`** permission (the
reporting integration only needed `ads_read` — this is a different, broader scope,
so the existing token will need to be regenerated), plus `META_PAGE_ID` — the
Facebook Page ID that ads run from (find it under the Page's About section, or via
Business Settings → Accounts → Pages).

Google Ads campaign creation isn't built yet — it requires substantially more
required fields per API call than Meta's flow. Flagged as a fast-follow, not started.

## Deploy on Vercel

Import this repository in [Vercel](https://vercel.com/new), point it at the
`claude/adrien-dashboard-juliano` branch, and add the environment variables above.
