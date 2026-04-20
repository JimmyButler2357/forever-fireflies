# Forever Fireflies — Feature Roadmap & Build Plan

Everything we're building and when — from MVP checklist to future vision. For detailed feature specs, see [Product Spec](product-spec.md). For screen-by-screen layouts, see [App Workflow](../design/app-workflow.md). For visual rules, see [Design Style Guide](../design/design-style.md).

Last updated: April 2026

---

## Current Status (April 2026)

**Where we are:** Phases 1–9 are shipped. The app works end-to-end in development and Android APK preview builds. All launch-gating work now lives in **Phase 10A (Before Beta)** and **Phase 10B (Before Public Launch)** below.

### In Progress

- **Home screen redesign** — tabs, calendar view, notifications modal (WIP commit `92990ff`)
- **Entry detail refinements** — polish to transcript display, metadata editing (uncommitted)
- **Raw transcript display fix** — 4 bugs around showing raw speech-to-text before `process-entry` edge function cleans it. Plan: replace live transcript with "Capturing your memory" + bouncing dots, return `cleaned_transcript` from edge function, shimmer UI while AI processes
- **Prompts system expansion** — ✅ shipped. Category column (everyday/milestones/funny/feelings/firsts), 25 new age-bucketed prompts (0–7yr), two-row filter UI with atomic snapshot transitions
- **Landing page build-out** — `landing/` folder has `index.html`, `privacy.html`, `delete-account.html`, `auth/callback.html`, + design playgrounds. **Not yet deployed** to Cloudflare Pages at foreverfireflies.app

### Blocked (awaiting payment or hardware)

| Blocker | Cost | Gates |
|---------|------|-------|
| Apple Developer Program | $99/yr | TestFlight, App Store, RevenueCat↔App Store, Small Business Program |
| Google Play Console | $25 one-time | Play Internal Testing, Play Store listing, RevenueCat↔Play |
| Physical iPhone | hardware | iOS-specific testing (simulator can't do voice, social auth, or push) |
| Xcode on Mac | hardware | iOS builds via EAS |

### Next Unblocked Work

1. **Supabase dev/prod split** — biggest unblocker for safely inviting beta testers (see Phase 10A)
2. **RevenueCat account creation** — can start without store accounts; connecting to stores comes later
3. **App icon + splash screen** — needed for any store submission
4. **Landing page deployment** — Cloudflare Pages, needed for privacy policy URL and pre-launch signups
5. **Terms page** — add at `foreverfireflies.app/terms`, link from login and Settings

---

## V1.0 — Launch

Everything needed to ship a working app to the App Store. The core journaling experience.

### Before You Start

- Expo Go won't work for this app — speech recognition requires a custom dev client (`npx expo prebuild`). This is standard.
- Developer accounts, hardware, and tooling are tracked in **Phase 10A** below.

### Dev Testing

The app runs entirely on local Zustand stores with seed data — no backend required yet. Here's how testing works at each stage:

- **Skipping onboarding:** The auth store's `hasCompletedOnboarding` flag controls routing. Set it to `true` to jump straight to the main app without tapping through onboarding every time
- **Testing individual screens:** Expo Router supports deep linking — you can navigate directly to any route (e.g., `/(main)/home`) without going through the full flow
- **Once auth is wired up:** Supabase sessions persist via AsyncStorage. You sign in once and stay signed in across app restarts — no re-login on every test run
- **Mock vs. real data:** Seed data (`constants/seedData.ts`) stays available for development. A `__DEV__` flag can toggle between local mock data and real Supabase calls, so you can always test UI without a network connection

### Beta Testing

- **Dev builds** (`development` profile): Used by the developer. Includes hot reload, shake menu, and dev tools. Built as APK via `npx eas build --profile development --platform android`
- **Preview builds** (`preview` profile): Used by 3 beta testers. Production-like APK without dev tools. Built via `npx eas build --profile preview --platform android`
- **Distribution**: APKs shared directly with beta testers (sideloaded, not via Play Store)
- **Firebase**: Android push notifications require FCM — `google-services.json` in project root, referenced in `app.json`

### Phase 1: Scaffolding ✅

App launches, builds on device, navigation between all screens.

- [x] Expo project initialized with TypeScript
- [x] Design tokens configured in `constants/theme.ts` (colors, typography, shadows, radii, spacing)
- [x] Expo Router file-based navigation with all screen routes
- [x] Zustand stores with AsyncStorage persistence (auth, children, entries, ui)
- [x] Seed data for 3 children and 5 entries
- [ ] Environment variables for service keys (deferred — no services connected yet)
- [ ] Verify build on physical iPhone

### Phase 2: Static Screens

Every wireframed screen is a real component with hardcoded data. Tappable prototype on device.

- [x] Home screen (timeline feed, child tabs, single/multi-child variants, first-entry celebration state)
- [x] Recording screen (prompt cards, breathing circle visualization, 60s timer, auto-stop)
- [x] Entry Detail (metadata, child pills with ×/+, tag row + editor, transcript area, audio playback bar, heart toggle, delete with confirmation)
- [x] Firefly Jar screen (warm gradient, serif title, memory count, larger cards, inline audio play, empty state)
- [x] Inline search on Home screen (collapsible search bar, tag/date filter chips, highlighted results, result count pill, no-results state)
- [x] Settings screen (children list, reminder time, subscription, Recently Deleted, data export, account deletion, about/legal)
- [x] Empty state screen (warm radial gradient, prompt card, pulsing mic)
- [x] Onboarding — 9 screens: Sign In, Add Child, Mic Permission, Notifications, First Recording, First Memory Text, Memory Saved, Welcome Preview, Paywall
- [x] Shared components (TopBar, EntryCard, ChildPill, ChildTab, PrimaryButton, TagPill, ConfirmationDialog, MicButton, PaperTexture, NotificationPreview, ErrorState)
- [x] Animation polish (fadeInUp stagger, mic pulse, breathing circle, reduce motion support)
- [x] Welcome Preview screen — onboarding screen 8, between Memory Saved and Paywall *(see Product Spec §2.2)*
- [x] Location field on Entry Detail — display and edit `locationText` in metadata block
- [x] Serif font decision — using Merriweather; design spec updated to match
- [x] Settings "Add Child" birthday picker — scroll-wheel picker matching onboarding style
- [x] Design cleanup (3 items):
  - [x] **EntryCard.tsx hardcoded colors** — border/shadow colors now use theme tokens; play button accent backgrounds updated to use `childColorWithOpacity(colors.accent, ...)`
  - [x] **NotificationPreview.tsx touch targets** — action buttons now use `minHeight: minTouchTarget` (44px) with proper spacing tokens
  - [x] **entry-detail.tsx audio bar** — `playBtn` gets `hitSlop` for 44px touch compliance; `reRecordBtn` contradiction resolved (36px visual + hitSlop)

Every screen handles empty, loading, and error states.

### Phase 3: Backend Setup ✅

Database, auth, and storage infrastructure is live. No UI changes — just plumbing.

> **Schema reference:** See [`database-schema.md`](database-schema.md) for the full table inventory and migration sequence.

- [x] Create Supabase project (dev) — prod project deferred to pre-launch
- [x] Design schema via Supabase CLI migrations (31 migrations — 13 tables)
- [x] Row Level Security (RLS) on every table + security hardening pass (migrations 021-031)
- [x] Database indexes (full-text GIN, partial indexes for timeline + favorites, compound indexes)
- [x] Configure auth providers (Apple Sign-In + Google + Email) — service layer ready, OAuth redirect wired in Phase 4
- [x] Set up Storage bucket for audio files (private, RLS policies, upsert enabled)
- [x] Abstract storage behind a service layer (9 service modules in `services/`)

> Apple Sign-In is mandatory if you offer any social login — App Store requirement.

### Phase 4: Auth & Profiles ✅

Sign in works for real. Child profiles save to the database. User sees their own data.

- [x] Wire Sign In screen to Supabase auth (Apple + Google + Email)
- [x] Add OAuth `redirectTo` for deep-linking back into the app after Apple/Google sign-in
- [x] Protected routes — unauthenticated → onboarding, authenticated → Home
- [x] Create child profiles in Supabase (name required, birthday required, nickname optional)
- [x] Auto-assign child colors from palette in order (Blue, Amber, Green, Plum, Teal, Rose)
- [x] Edit and delete child profiles from Settings
- [x] Child tabs on Home pull from real data
- [x] Environment variables for all auth/service keys — nothing hardcoded

### Phase 5: Recording & Entries ✅

Record → transcribe → save → view works end-to-end. The core product loop.

- [x] Voice recording with `expo-speech-recognition` (`persist: true`, `requiresOnDeviceRecognition: true`)
- [x] Real-time partial transcript displayed during recording
- [x] 60-second auto-stop (hard cap for MVP)
- [x] Recording → Entry Detail with transcript populated
- [x] Save transcript + upload audio to Supabase Storage
- [x] Auto-detect child names/nicknames from transcript → pre-fill child pills
- [x] Auto-apply topic tags via keyword matching
- [x] "Or write instead" → blank Entry Detail (text-only, same save flow minus audio)
- [x] Date picker for backdating entries (reuse birthday picker component)
- [x] Location capture with `expo-location` (auto-detect + manual override, stored as text label)
- [x] Audio playback on Entry Detail (play/pause + scrub bar)
- [x] Re-record from Entry Detail (confirmation dialog → Recording screen in re-record mode → overwrite audio + transcript, preserve all metadata)
- [x] Soft delete with 30-day recovery (Recently Deleted in Settings)
- [x] Auto-purge cron job — Supabase edge function or pg_cron to hard-delete entries where `deleted_at < now() - 30 days`
- [x] Edge cases: mic denied, empty audio, transcription failure

### Phase 6: Search & Favorites ✅

Browse, search, and curate entries with real data.

- [x] Wire inline search to Supabase full-text search
- [x] Child tabs + tag + date range filters query real data
- [x] Date range presets (Last 7 days, Last month, Last 3 months, All time)
- [x] Highlighted search matches in result cards
- [x] Firefly Jar screen pulls real favorited entries
- [x] Inline audio play on Firefly Jar cards (stopPropagation)
- [x] Heart toggle syncs to Supabase
- [x] Empty states for no results and no favorites

### Phase 7: Notifications & Prompts ✅

Daily habit loop drives nightly recording.

- [x] Server-sent push notifications via Expo Push API + FCM (Android) — replaces local scheduling
- [x] Personalized prompt with child name + age (e.g., "What made Emma smile today?")
- [x] "Record" action → Recording screen; "Remind Me Later" → 30-minute snooze
- [x] Tapping notification body → Home screen
- [x] Browsable Prompts screen with category filters (All, Everyday, Baby, Toddler, Preschool+), shuffle, and age-based filtering — accessible via dropdown menu
- [x] Notification time configurable in Settings
- [x] Notification backoff logic — if `notification_log` shows 5+ ignored days, reduce frequency (edge function)
- [x] ~~"No memories yet" nudge~~ — moved to Phase 10 welcome email series (better as a soft email follow-up than a second push notification)

### Phase 8: Subscription & Paywall ✅

Trial → paid conversion via RevenueCat.

- [x] RevenueCat SDK integration with dev/preview bypass mode (`lib/revenueCat.ts`)
- [x] 7-day free trial tracked via `trial_started_at` in profiles table
- [x] Idempotent `start_trial` RPC — fires on first entry save
- [x] Guard trigger protects `trial_started_at` from client tampering
- [x] Subscription store with 3-gate access check: dev bypass → RevenueCat → trial (`stores/subscriptionStore.ts`)
- [x] Post-trial read-only state — browse entries but no recording, editing, or audio playback
- [x] Subscribe banner replaces mic button when trial lapses; Firefly Jar icon hidden
- [x] `PostTrialPaywall` modal with plan selection (annual/monthly)
- [x] Onboarding paywall wired to RevenueCat restore flow
- [x] Subscription status shown in Settings (trial countdown / active / expired)
- [x] Defense-in-depth redirects on Recording and Firefly Jar screens
- [ ] ~~Connect RevenueCat to App Store / Google Play~~ — moved to Phase 10A (requires accounts first)
- [ ] ~~Apply for Apple Small Business Program~~ — moved to Phase 10B (before first public sale)

### Phase 9: Analytics & Delight

Measure what matters. Add warmth.

- [x] Sentry error tracking — crash reports, user context, navigation breadcrumbs (`lib/sentry.ts`)
- [x] PostHog event tracking — 8 key events across onboarding, recording, browsing, and subscription (`lib/posthog.ts`)
- [x] Key funnels configured in PostHog dashboard: Onboarding → Subscription + Trial Engagement (avg memories in first 7 days)
- [x] Idle fireflies animation (`components/IdleFireflies.tsx`)
- [x] Jar glow header (`components/JarGlowHeader.tsx`)
- [x] Milestone celebration component (`components/MilestoneCelebration.tsx`)
- [x] Favorite animation — amber burst on heart tap (`components/FavoriteAnimation.tsx`). Burst-only (rising firefly removed — no jar visible on Entry Detail where favoriting happens)
- [x] First Entry Celebration — Home banner + glowing card border *(see Product Spec §4.2)*
- [x] Memory Saved animation in onboarding — heart scale-in with gentle overshoot (`memory-saved.tsx`)
- [x] First Memory Marker badge per child
- [x] Age stamps on Entry Detail (auto-calculated from child birthday) — intentionally not on EntryCards to keep the timeline clean
- [ ] Additional tracking (add as features ship): 60s cap hit rate, notification tap-through, share card generation rate, Memory of the Day tap-through + share rate, Memory Calendar views + day-tap rate (V2) — ongoing, not blocking launch

### Phase 10A: Before Beta

Everything needed before real parents touch the app. Their memories must be safe and the app must work end-to-end.

#### Rebrand Cleanup — remove all "Core Memories" references

Do this first so all new infrastructure (prod Supabase, RevenueCat, store listings) is set up with the correct name from the start.

- [x] **Critical (affects functionality):**
  - [x] Update deep link scheme from `core-memories://` to `forever-fireflies://` in `app.json`
  - [x] Update iOS bundle ID from `com.corememories.app` → `com.foreverfireflies.app` in `app.json`
  - [x] Update Android package from `com.corememories.app` → `com.foreverfireflies.app` in `app.json`
  - [x] Update OAuth redirects in `services/auth.service.ts` (Apple, Google, password reset)
  - [x] Update Supabase redirect allowlist in `supabase/config.toml`
  - [x] Push updated Supabase config to remote project
- [x] **Code cleanup:**
  - [x] Rename `app/(main)/core-memories.tsx` → `firefly-jar.tsx`
  - [x] Update Stack.Screen registration in `app/(main)/_layout.tsx`
  - [x] Update navigation route in `app/(main)/home.tsx`
  - [x] Update NPM package name in `package.json`
  - [x] Update Supabase local project ID in `supabase/config.toml`
  - [x] Update code comments referencing old scheme (`_layout.tsx`, `entryHelpers.ts`)
- [x] **External (manual):**
  - [x] Rename GitHub repository → `forever-fireflies`
  - [x] Update Supabase project display name → `Forever Fireflies`

#### Developer Accounts & Hardware

- [ ] Enroll in **Apple Developer Program** ($99/yr) — approval takes 24-48 hours
- [ ] Create **Google Play Console** account ($25 one-time)
- [ ] Install **Xcode** on Mac (required for iOS builds, even with Expo)
- [ ] Get a **physical iPhone** for testing — Simulator can't do voice recording, social auth, or notifications
- [ ] Install **EAS CLI** (`npm install -g eas-cli`) on Mac

#### Supabase Dev/Prod Split

Right now there's one Supabase project for everything. Before beta testers record real memories, split into dev and prod so test data and real data never mix.

- [ ] Create **Supabase prod project** (new project, free tier)
- [ ] Apply all migrations to prod (`supabase db push --linked`)
- [ ] Seed prod with system tags and prompts (not test entries)
- [ ] Deploy edge functions to prod (`process-entry`, `send-notifications`, `purge-deleted`)
- [ ] Set edge function secrets on prod (`ANTHROPIC_API_KEY`)
- [ ] Insert Vault secrets on prod (for pg_cron → edge function calls)
- [ ] Set up **environment files**: `.env.local` → dev, `.env.production` → prod
- [ ] Wire **EAS build profiles** to correct env: `development` → dev keys, `preview`/`production` → prod keys
- [ ] Smoke-test a full flow on prod: sign up → add child → record → save → browse → search → favorite

#### RevenueCat Setup

- [ ] Create **RevenueCat account** at revenuecat.com
- [ ] Create a project for Forever Fireflies
- [ ] **Connect to App Store Connect** (requires Apple Developer enrollment)
- [ ] **Connect to Google Play Console**
- [ ] Create **products** in App Store Connect and Google Play Console (monthly + annual plans)
- [ ] Map products to **Offerings** in RevenueCat
- [ ] Add RevenueCat **API keys** (Apple + Google) to prod environment config
- [ ] Remove dev/preview bypass in `lib/revenueCat.ts` for production builds (keep for dev)
- [ ] Test purchase flow end-to-end with **sandbox accounts** (Apple) and **test cards** (Google)

#### Beta Distribution

- [ ] Build **iOS beta** via EAS (`preview` profile) → upload to **TestFlight**
- [ ] Build **Android beta** via EAS (`preview` profile, AAB) → upload to **Google Play Internal Testing** track
  - Update `eas.json` preview profile: change `buildType` from `"apk"` to `"app-bundle"`
  - Create app listing in Google Play Console (basics only — name + placeholder description)
  - Add testers by email → they get a Play Store install link (auto-updates, no sideloading)
- [ ] Recruit **15-25 real parents** as beta testers (mix of iOS + Android)
- [ ] Collect feedback → fix → rebuild → repeat

### Phase 10B: Before Public Launch

Polish, legal, and marketing — everything needed between "beta works" and "App Store submission."

#### Legal & Compliance

- [x] Privacy policy HTML drafted (`landing/privacy.html`) — still needs to be deployed + review pass
- [ ] Deploy landing site to Cloudflare Pages at `foreverfireflies.app` so privacy policy has a real URL
- [ ] Terms of service — add `landing/terms.html` hosted at `foreverfireflies.app/terms`, link from login screen and Settings
- [ ] **COPPA compliance review** *(see Product Spec §8)* — app records children's info; Lifestyle category helps but still needs careful handling
- [ ] Apply for **Apple Small Business Program** (15% commission) before first sale

#### App Store Assets & Listing

- [ ] App icon (1024×1024 for store + all device sizes)
- [ ] Splash screen design
- [ ] App Store screenshots (6.7" and 6.1" iPhone sizes minimum)
- [ ] Google Play Store screenshots
- [ ] App Store listing copy — description, keywords, subtitle (Lifestyle category, NOT Kids)

#### Accessibility & Performance

- [ ] Accessibility audit (labels, touch targets ≥44pt, contrast ≥4.5:1, Dynamic Type)
- [ ] Performance targets (cold start <2s, transcription <5s, first entry <90s from install)

#### Data Export

- [ ] Edge function or RPC to export all user entries + audio as downloadable archive (privacy compliance)
- [ ] Re-add "Export All Entries" row to Settings > Data & Privacy once export edge function is built

#### Email Marketing

- [ ] Pick email tool (e.g., Resend, Loops, Mailchimp)
- [ ] Integrate with auth flow — trigger welcome sequence on account creation
- [ ] Welcome email series (includes "no memories yet" nudge for users who didn't record during onboarding)

#### Documentation Cleanup

- [ ] Update doc titles in `docs/business/scaling.md`, `docs/product/functional-requirements.md`
- [ ] Update example project names in `scaling.md`, `product-spec.md`
- [ ] Update `docs/product/implementation-plan-phases-4-5.md` references
- [ ] Update PDF output filename in `docs/business/financial-summary.py`
- [ ] Update `architecture-explorer.html` label

#### Submit

- [ ] Final round of fixes from beta feedback
- [ ] Submit to **App Store** (Apple review ~24-48 hours)
- [ ] Submit to **Google Play Store**

### Milestones

| # | Milestone | What you can show | Phase |
|---|-----------|-------------------|-------|
| M1 | Skeleton | App launches, tap between all screens | 1 ✅ |
| M2 | Looks real | Screens match wireframes — tokens, texture, serif, warm palette | 2 ✅ |
| M3 | Auth works | Sign in, create child, see empty Home | 4 ✅ |
| M4 | Can record | Voice recording, breathing circle, 60s auto-stop, transcript | 5 ✅ |
| M5 | Core loop | Record → auto-detect child → save → browse → search → playback | 5–6 ✅ |
| M6 | Favorites | Firefly Jar with elevated cards, inline audio play | 6 ✅ |
| M7 | Habit loop | Personalized notifications drive daily recording | 7 ✅ |
| M8 | Money works | Trial → paywall → subscribe via RevenueCat | 8 ✅ |
| M9 | Beta ready | Dev/prod split, RevenueCat live, rebrand done | 10A |
| M10 | Beta | TestFlight + APK in real parents' hands | 10A |
| M11 | Ship | App Store + Google Play submission | 10B |

---

## V1.5 — Retention & Polish (Month 4-6 post-launch)

Make the app smarter, more useful, and harder to leave. Focus on AI features and content depth.

| Feature | Description |
|---------|-------------|
| ~~**AI-generated titles**~~ ✅ | **Done — pulled forward to V1.0.** `process-entry` edge function (v10) generates titles via Claude Haiku. Editable by parent |
| ~~**AI transcript cleanup**~~ ✅ | **Done — pulled forward to V1.0.** Same `process-entry` edge function removes filler words while preserving the parent's authentic voice |
| ~~LLM-powered auto-tagging~~ ✅ | **Done — pulled forward to V1.0.** `process-entry` applies smart tags via Claude Haiku, replacing keyword matching |
| "On this day" resurfacing | Memory from 1 year ago surfaces at the top of the feed with special card treatment |
| Milestone celebrations | AI detects milestone language, flags with star badge + celebration animation |
| Age milestone markers | Divider cards at birthday boundaries in the timeline |
| Developmental prompts | Age-appropriate prompt suggestions that evolve as children grow |
| **Add photos (cap 3)** | Attach up to 3 photos per entry. Gallery picker only (no camera in V1.5). Photos are extras — every entry still requires voice or text. New `entry_media` table (pre-wired for video). 3 new packages: `expo-image-picker`, `expo-image-manipulator`, `expo-image`. Photos compressed client-side (~800px, 80% JPEG). 3 new UI components: PhotoPicker, PhotoThumbnailRow, PhotoViewer. See product-spec.md §V1.5 for full spec and database-schema.md §4.1 for table definition |
| **Birthday quiz** | On a child's birthday, app sends special notification with guided questions (favorite food, funny words, current obsessions). Saves as a structured text entry — annual snapshot |
| **Help / menu section** | Expandable menu with FAQ, "Ways to Use Your Memories" articles (link to website), Contact Us, mission/about |
| **Shareable memory cards** | Tap "Share" on any entry card → generates a branded quote-card image (child's words, name + age, date, subtle Forever Fireflies watermark). Static image works everywhere — iMessage, Instagram Stories, Facebook, etc. Uses native share sheet. Replaces plain-link sharing |
| **Memory of the Day** | Daily featured memory banner at the top of Home screen. Pulls a past entry (random or "on this day" if available). Includes a one-tap "Share" button that generates the branded quote card. Low-friction daily touchpoint that drives sharing + re-engagement |
| Family recap emails | Weekly text digest + monthly audio highlight reel. Requires email marketing infrastructure set up at launch (see marketing-plan.md — Email Strategy) |
| **In-app contact form** | Replace mailto link with a native form inside the app (subject dropdown: bug / feature request / question / other + text area). Submissions saved to a `feedback` Supabase table with user ID, device info, and app version auto-attached. More polished than mailto and captures structured data |
| **AI feedback triage** | Edge function (similar to `process-entry`) classifies each submission via Claude Haiku as bug / feature-request / question / praise. Auto-drafts an email reply for review, and auto-creates GitHub issues (with labels) for bugs and feature requests via GitHub API. Human-in-the-loop: drafts queue for approval before sending |
| Cloud transcription fallback | For entries where on-device transcription has low confidence, offer cloud upgrade |
| **24-hour nudge** | Push notification 24 hours after a user's first entry: "Yesterday you saved [title]. What happened today?" The gap between entry 1 and entry 2 is where most journaling apps lose people — this bridges it. Only fires once. Uses the AI-generated title from the first entry to make it personal and specific |
| **First-entry show-and-tell tour** | After a user saves their very first entry and lands on the Entry Detail screen, a brief guided overlay highlights what the app just did for them — the AI-generated title, auto-detected child name, cleaned-up transcript, and auto-applied tags. Shows the value of the processing pipeline in a "look what we did with your 30 seconds" moment. Only triggers once (first entry ever). Dismissible, non-blocking |
| Quiet week prompt | Gentle re-engagement for users inactive 7+ days |
| Quick-react mood tags | One-tap mood icon after recording (laughing, crying, proud, exhausted); filterable later |
| `prompt_history` cleanup | Add retention policy — cron job to prune rows older than 90 days, or cap at N rows per user. Table grows unbounded without this |
| **"Ink Reveal" transcript animation** | When a voice recording is transcribed, the transcript "writes itself" onto the page on first view — words fade in left-to-right with a blur-to-sharp effect, like ink appearing on parchment. Only triggers once per entry (voice transcripts only, not text entries). Tracked via a `seen` flag per entry |

**Bold** = new ideas from Feb 2026 brainstorm session.

---

## V2 — Growth & Expansion (Month 6-12 post-launch)

Multi-user features, richer media, and smarter search. The app evolves from a solo journal to a family archive.

| Feature | Description |
|---------|-------------|
| **Parent merge (linked accounts)** | Each parent has their own account; they pair via invitation. Both see a unified feed of children and entries. Each entry shows who recorded it. Second parent can add their own recording/perspective to an existing memory |
| **Memory view filtering** | Toggle to see "My memories," "Partner's memories," "Both," or "Others" (grandparents via share links). New filter axis alongside child tabs |
| **Search scroll (Google Photos style)** | As you scroll the feed, a floating date indicator shows where you are. Fast-scrolling accelerates through months and years. Essential once a user has hundreds of entries |
| **Memory Calendar** | Month-by-month calendar grid as an alternative way to browse entries. Days with entries show child-colored dots; days with photos show small thumbnails. Tap any day to see that day's entries. Swipe between months/years. Respects child tab filtering. Access point TBD — could be a toggle on Home (list ↔ calendar) or a new bottom-nav item if the app moves to a tab bar. Think Google Calendar meets baby journal |
| **Video clips (short)** | Short video attachments on entries (10–30s cap). Builds on V1.5 photo infrastructure — `entry_media` table already pre-wired with `media_type = 'video'`, `thumbnail_path`, and `duration_seconds`. Adds 2–3 packages (video player, compressor, thumbnail extractor). Needs progress bar UI, background upload, bandwidth detection. Storage ~$0.50/month per active user after 12 months. Ship photos first in V1.5, validate demand, then add video |
| **Start/stop recording** | Pause and resume during a recording. Audio segments stitched together. Lets parents collect their thoughts mid-recording |
| **Location search** | Search and filter entries by location — simple text matching, not geo-queries (e.g., search "Italy" to find all vacation memories). Location-based recaps (e.g., "Your Tampa trip, 2025") |
| AI semantic search | Natural language queries ("When did Liam first talk about wanting a dog?") via pgvector + RAG pattern |
| Partner prompt / question of the day | Both parents get the same daily prompt, record independently, paired responses surfaced side-by-side at week's end |
| Memory Sparks | Import photo from camera roll, app prompts "What was happening here?" — bridges photos and voice |
| Extended family sharing | Invite links for grandparents/family to view and contribute recordings. No app download or account needed — grandma gets a web link, taps it, and can listen to recordings and see shared memories. Family members can also share memories *to* her. Web-based participation keeps the barrier zero; the app is for primary caregivers |
| **Caregiver access** | Invite a nanny, babysitter, or au pair to contribute entries during their care hours. Caregiver gets a lightweight web link (same no-download approach as family sharing). They can record moments the parents missed during the workday. Caregiver role is separate from family — can be revoked easily when care arrangements change. Entries tagged with who recorded them |
| Keepsake book builder | Print-on-demand physical books compiled from entries with auto-generated yearly suggestion |
| **Retranscribe with Whisper** | On-device speech recognition (`expo-speech-recognition`) struggles in noisy/windy environments and there's no way to fix a bad transcript after the fact. Integrates **OpenAI Whisper API** for true cloud speech-to-text — pulls the stored WAV from Supabase Storage, sends it to Whisper, and replaces the transcript with a higher-quality result. New edge function (or extension of `process-entry`) downloads the audio, calls Whisper, then re-runs the AI cleanup pipeline (title, tags, filler removal) on the fresh transcript. Gives parents a second chance at an accurate transcript without re-recording. UI: "Retranscribe" button on Entry Detail with confirmation modal |
| Extended recording | "Keep Going" button at 60s extends to 3-minute cap (if user data warrants it) |
| Referral program | Invite a parent friend, both get a free month |
| Yearly recap | "Year in Memories" email with curated audio, growth stats, and year-end letter prompt |

**Bold** = new ideas from Feb 2026 brainstorm session.

---

## V3+ — Future Vision (Year 2+)

Big bets and platform plays. Only pursue with validated demand.

| Feature | Description |
|---------|-------------|
| Interview Mode | Guided Q&A to record the child's own voice and answers |
| Collaborative family timeline | All family members see a shared, unified timeline |
| **Responsive milestones** | As kids hit milestones, app surfaces age-appropriate recommendations, wisdom, and (opt-in) curated product suggestions via affiliate links. Requires dedicated marketing support to execute well |
| Time Capsule entries | Record a message that "unlocks" at a future date (age 18, graduation) |
| Letter to future child | Special recording mode — parent speaks directly to their child for someday |
| Foster care adaptation | Structured documentation features, agency partnerships |
| Sibling comparison | Side-by-side view of Child A at age 3 vs. Child B at age 3 |
| Export options | PDF export, full data export, text-based printed journal |
| Offline recording | Record without internet, background sync when connected |

**Bold** = new ideas from Feb 2026 brainstorm session.

---

## Parked

Ideas worth recording but not currently prioritized. Revisit if user feedback or business needs change.

| Feature | Why parked |
|---------|-----------|
| **Merge two memories (drag & drop)** | UX is unclear — what happens to two audio files, two transcripts, different child tags? Edge case that rarely occurs. Simpler workaround: copy-paste text and delete the duplicate |

**Bold** = new ideas from Feb 2026 brainstorm session.

---

## Reference

### Schema Fields Baked In at V1.0

These fields exist in the database schema now even though their full features ship later. Costs nothing now, prevents expensive rework later.

| Field | On Table | Used By | Ships In |
|-------|----------|---------|----------|
| `title` | entries | AI-generated titles | ~~V1.5~~ V1.0 ✅ |
| `recorded_by` | entries | Parent merge / linked accounts | V2 |
| `location_text` | entries | Location capture + search | V1.0 (capture), V2 (search) |
| `media_type` | entry_media | Video clips (column accepts `'video'` from day one) | V1.5 (photos), V2 (video) |
| `thumbnail_path` | entry_media | Video poster frame for feeds | V2 (video) |
| `duration_seconds` | entry_media | Video length display + cap enforcement | V2 (video) |

### Cost at Launch

| Service | Free Tier | Upgrade Trigger | Paid |
|---|---|---|---|
| Apple Developer | — | Day 1 | $99/yr |
| Supabase | 500MB DB, 1GB storage | ~500 users | $25/mo |
| RevenueCat | Up to $2,500/mo revenue | $2,500+ | % of MTR |
| PostHog | 1M events/mo | 1M+ | Usage-based |
| Sentry | 5K errors/mo | 5K+ | $26/mo |
| EAS Build | 30 builds/mo | Need more | $15/mo |

Total at launch: **~$99/year** (just Apple Developer).

---

*This roadmap is a living document. Features may shift between versions based on user feedback, technical feasibility, and business priorities.*
