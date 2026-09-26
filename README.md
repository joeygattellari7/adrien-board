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
   description/CTA variations for a product/offer, plus a free-form "extra
   details" brief (must-include phrases, brand guidelines, etc.) that's folded
   into the prompt. Uses the Anthropic API for genuinely varied copy when
   `ANTHROPIC_API_KEY` is set; otherwise falls back to fixed templates so it
   always returns something usable.
2. **Meta campaign builder & launcher** (`/api/creative/launch`,
   `/api/creative/activate`) — builds a full campaign → ad set → ad creative → ad
   directly via the Graph API, with:
   - Full audience targeting: countries, age range, gender, and free-text
     interests (resolved to Meta's interest-targeting IDs via the ad interest
     search endpoint — best match per name, unmatched names are skipped rather
     than failing the request).
   - A Conversions objective with pixel ID + conversion event fields (Juliano's
     Meta account has no pixel configured yet, so this objective will fail
     until one is set up — the UI flags this).
   - Up to two images — a 1:1 square and a 9:16 vertical — with live aspect-ratio
     previews in the form. When both are provided, the creative uses
     `asset_feed_spec` so Meta auto-selects the right image per placement
     (feed vs. Stories/Reels) instead of stretching one image everywhere.
   - A review/preview step (mock ad card + a plain-English summary of the
     campaign/ad set/audience) that has to be explicitly confirmed before
     anything is sent to Meta at all.

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

3. **Google campaign builder & launcher** (`/api/creative/google/copy`,
   `/api/creative/google/launch`, `/api/creative/google/activate`) — a second
   platform tab alongside Meta, building Search, Display, or Performance Max
   campaigns directly via the Google Ads API:
   - Campaign → one or more ad groups (Search/Display) or asset groups
     (Performance Max), each with its own headlines (≤30 chars),
     descriptions (≤90 chars), and — for Display/Performance Max — one or
     more images.
   - Search ad groups take keywords typed one per line, using the same
     syntax as Google Ads Editor: plain text = broad match, `"in quotes"` =
     phrase match, `[in brackets]` = exact match.
   - A "Generate headlines, descriptions & keywords" button per ad group
     calls the Anthropic API (same product/offer/tone/details brief as the
     Meta copy generator) for AI-written Google-length copy plus keyword
     ideas, falling back to templates without `ANTHROPIC_API_KEY`.
   - Performance Max's asset requirements are approximated (Google
     recommends more headlines/images than the bare minimum used here) —
     first drafts may need small tweaks in the Google Ads UI before they
     clear review, flagged in the UI itself.

**Same safety design as Meta**: campaigns, ad groups/asset groups, and ads
are always created `PAUSED`. A separate "Activate" button is the only thing
that enables them — never automatic.

**Setup**: reuses the same `GOOGLE_ADS_CLIENT_ID`, `GOOGLE_ADS_CLIENT_SECRET`,
`GOOGLE_ADS_REFRESH_TOKEN`, `GOOGLE_ADS_CUSTOMER_ID` credentials as the
read-only reporting integration above — no extra setup needed as long as the
OAuth token was authorized with the `https://www.googleapis.com/auth/adwords`
scope (which grants both read and write).

## Content Studio & Scheduler

Two more tabs, for repurposing existing photos/video (or generating from
scratch) across every social platform and queueing it to go out:

1. **Content Studio** (`/api/content/repurpose`) — upload a photo or video,
   generate one with AI (`/api/content/generate-image` — OpenAI's image API,
   from the same product/offer/tone/details brief as the copy generators),
   or leave it blank entirely, pick platforms (Meta, YouTube, LinkedIn,
   TikTok, Twitter/X), and it generates a tailored caption + hashtags per
   platform (Anthropic API, template fallback) plus a center-cropped image
   resized to each platform's native aspect ratio (via `sharp`).
   - **Video is now resized** (crop/scale to each platform's aspect ratio,
     trimmed to its max length) via `ffmpeg` (`fluent-ffmpeg` +
     `@ffmpeg-installer/ffmpeg`), with the result uploaded to Vercel Blob and
     scheduled by URL rather than inline bytes. This is genuinely best-effort
     — ffmpeg in a serverless function has real constraints (execution time
     limits, `/tmp` size, no persistent disk between invocations) that
     couldn't be fully validated outside an actual Vercel deploy; the pipeline
     itself was tested end-to-end locally (a real ffmpeg crop/scale/trim run)
     but not against Vercel's specific limits. If it fails, the platform
     falls back to a note with the target spec instead of a broken file.
     Requires `BLOB_READ_WRITE_TOKEN` (see Setup below) — without it, video
     falls back to the target-spec note as before.
   - AI video generation (Runway/Luma/Veo/Kling) is still not wired up —
     each is a separate paid API, a further fast-follow once one's chosen.
2. **Scheduler** (`/api/content/schedule`, `/api/content/publish-due`) — a
   queue of everything scheduled from Content Studio. A Vercel Cron job
   (`vercel.json`, daily — see the Cron note below) hits `/api/content/publish-due`:
   - **Meta** posts automatically via the Facebook Page's `/photos` or
     `/feed` endpoint (an organic post, separate from the paid ad campaigns
     above) when a post comes due.
   - **YouTube, LinkedIn, TikTok, Twitter/X** don't have posting APIs wired
     up yet — each needs its own developer app, OAuth consent, and (for
     TikTok in particular) a manual approval process. Due posts on these
     platforms flip to "needs manual post" in the Scheduler so nothing
     silently fails to go out — you post it yourself and click "Mark
     posted."

**Setup**:
- Meta auto-posting needs `META_ACCESS_TOKEN` with **`pages_manage_posts`**
  permission (a third scope, distinct from `ads_read` and `ads_management`)
  plus the existing `META_PAGE_ID`.
- The scheduler queue needs `UPSTASH_REDIS_REST_URL` and
  `UPSTASH_REDIS_REST_TOKEN` (add a Redis integration from the Vercel
  Marketplace) for persistence. Without it, the queue falls back to
  in-memory storage that doesn't survive a restart or cold start — fine for
  trying it out, not for production use.
- Video (resizing, or storing one in Adrien Brain's content library) needs
  `BLOB_READ_WRITE_TOKEN` (add a Blob store from the Vercel project's
  Storage tab, which sets this automatically). Redis's REST API caps value
  sizes well below what a video file needs, so Blob is used for video
  specifically — images still go through Redis/in-memory as before.
- **Vercel Cron note**: the Hobby plan only allows daily cron runs, so
  `vercel.json` schedules `/api/content/publish-due` once a day (9am UTC).
  A more frequent check (every 5–15 min, so scheduled posts go out closer to
  their target time) needs a Pro plan — tighten the schedule there once
  you're on one. A 5-minute schedule on Hobby isn't just throttled, it
  **blocks every deployment outright** (Vercel rejects the whole build at
  validation), so don't loosen this without upgrading first.

## Adrien Brain

The orchestration layer on top of Content Studio and the Scheduler — the
goal is simple: **never let a platform go more than a day without a post,
two at the absolute most.**

- **Content library** (`/api/content/library`) — a standing folder of
  photos to repurpose, separate from any one Content Studio session. Add to
  it any time; each asset tracks how many times it's been used so Adrien
  Brain favors whatever's been sitting the longest.
- **Brand brief** (`/api/content/brand`) — a saved default
  product/offer/tone/details brief, so Adrien Brain doesn't need you to
  retype one every time it proposes something on its own.
- **The plan** (`/api/content/plan`) — on load, checks every platform's most
  recent scheduled/published/manual-post entry in the Scheduler. Any
  platform within 4 hours of the 24h mark shows as "Due soon"; past 48h
  shows as "Overdue." For each, it proposes a time, a caption (generated
  from the brand brief), and either the least-recently-used library asset
  ("repurpose") or a "Generate an image" button when the library's empty or
  exhausted. One click — "Approve & schedule" — sends it straight into the
  same Scheduler queue everything else uses.
- **Video** can now be added to the library too (needs `BLOB_READ_WRITE_TOKEN`
  — see above), stored and previewed by URL rather than inline like images.
- **2-week idea calendar** (`/api/content/calendar`) — one flagship content
  idea per day for the next 14 days (format: reel or static; tone: funny,
  serious, warm, or informative), adapt it per platform when you actually
  schedule it. Informed by real engagement/follower-trend numbers pulled
  from the Social Media Review data where available (Meta ← Facebook +
  Instagram, YouTube, TikTok — LinkedIn and Twitter/X aren't tracked there
  yet, so those get no performance signal). There's no live trends feed
  integrated (no TikTok Trends API, no Google Trends) — the AI reasons from
  its own general knowledge of platform trends instead, and says so in its
  reasoning rather than presenting it as live data. Template fallback
  without `ANTHROPIC_API_KEY`.

This reuses the Scheduler's Redis/in-memory backend and Content Studio's
image generation — no new env vars beyond what those already need, plus
`BLOB_READ_WRITE_TOKEN` for video.

## Deploy on Vercel

Import this repository in [Vercel](https://vercel.com/new), point it at the
`claude/adrien-dashboard-juliano` branch, and add the environment variables above.
