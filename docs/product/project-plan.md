# Core Memories — MVP Project Plan (v2)

High-level execution roadmap from wireframes to shipped app. For detailed specs, see [Product Spec](product-spec.md), [App Workflow](../design/app-workflow.md), and [Design Style Guide](../design/design-style.md).

---

## Before You Start

- [ ] Enroll in **Apple Developer Program** ($99/yr) — approval takes 24-48 hours
- [ ] Install **Xcode** (required even with Expo)
- [ ] Install **EAS CLI** (`npm install -g eas-cli`)
- [ ] Have a **physical iPhone** available — Simulator can't do voice recording, social auth, or notifications
- [ ] Expo Go won't work for this app — speech recognition requires a custom dev client (`npx expo prebuild`). This is standard.

---

## Dev Testing

The app runs entirely on local Zustand stores with seed data — no backend required yet. Here's how testing works at each stage:

- **Skipping onboarding:** The auth store's `hasCompletedOnboarding` flag controls routing. Set it to `true` to jump straight to the main app without tapping through onboarding every time
- **Testing individual screens:** Expo Router supports deep linking — you can navigate directly to any route (e.g., `/(main)/search`) without going through the full flow
- **Once auth is wired up:** Supabase sessions persist via AsyncStorage. You sign in once and stay signed in across app restarts — no re-login on every test run
- **Mock vs. real data:** Seed data (`constants/seedData.ts`) stays available for development. A `__DEV__` flag can toggle between local mock data and real Supabase calls, so you can always test UI without a network connection

---

## Phase 1: Scaffolding ✅

App launches, builds on device, navigation between all screens.

- [x] Expo project initialized with TypeScript
- [x] Design tokens configured in `constants/theme.ts` (colors, typography, shadows, radii, spacing)
- [x] Expo Router file-based navigation with all screen routes
- [x] Zustand stores with AsyncStorage persistence (auth, children, entries, ui)
- [x] Seed data for 3 children and 5 entries
- [ ] Environment variables for service keys (deferred — no services connected yet)
- [ ] Verify build on physical iPhone

---

## Phase 2: Static Screens

Every wireframed screen is a real component with hardcoded data. Tappable prototype on device.

- [x] Home screen (timeline feed, child tabs, single/multi-child variants, first-entry celebration state)
- [x] Recording screen (prompt cards, breathing circle visualization, 60s timer, auto-stop)
- [x] Entry Detail (metadata, child pills with ×/+, tag row + editor, transcript area, audio playback bar, heart toggle, delete with confirmation)
- [x] Core Memories screen (warm gradient, serif title, memory count, larger cards, inline audio play, empty state)
- [x] Search screen (auto-focus, filter chips, date range presets, highlighted results, no-results state)
- [x] Settings screen (children list, reminder time, subscription, Recently Deleted, data export, account deletion, about/legal)
- [x] Empty state screen (warm radial gradient, prompt card, pulsing mic)
- [x] Onboarding — 9 screens: Sign In, Add Child, Mic Permission, Notifications, First Recording, First Memory Text, Memory Saved, Welcome Preview, Paywall
- [x] Shared components (TopBar, EntryCard, ChildPill, ChildTab, PrimaryButton, TagPill, ConfirmationDialog, MicButton, PaperTexture, NotificationPreview, ErrorState)
- [x] Animation polish (fadeInUp stagger, mic pulse, breathing circle, reduce motion support)
- [x] Welcome Preview screen — onboarding screen 8, between Memory Saved and Paywall. Shows app with months of sample data to preview what they're building toward *(see Product Spec §2.2)*
- [ ] Location field on Entry Detail — display and edit `locationText` in metadata block (data model exists, UI missing)
- [ ] Serif font decision — design spec says Georgia, implementation uses Merriweather. Decide and align spec + code
- [ ] Settings "Add Child" birthday picker — modal uses today's date silently; needs scroll-wheel picker like onboarding Add Child screen
- [ ] Design cleanup — fix hardcoded hex in EntryCard Core Memory shadow, NotificationPreview touch targets (30px → 44px min), hardcoded audio bar values

Every screen handles empty, loading, and error states.

---

## Phase 3: Backend Setup

Database, auth, and storage infrastructure is live. No UI changes — just plumbing.

> **Schema reference:** See [`database-schema.md`](database-schema.md) for the full table inventory and migration sequence.

- [ ] Create `core-memories-dev` and `core-memories-prod` Supabase projects
- [ ] Design schema via Supabase CLI migrations (users, children, entries, entry_children, tags, entry_tags)
- [ ] Row Level Security (RLS) on every table before inserting any data
- [ ] Database indexes (user_id, child_id, created_at, full-text search, compound indexes)
- [ ] Configure auth providers (Apple Sign-In + Google + Email)
- [ ] Set up Storage bucket for audio files
- [ ] Abstract storage behind a service layer so components don't call Supabase directly

> Apple Sign-In is mandatory if you offer any social login — App Store requirement.

---

## Phase 4: Auth & Profiles

Sign in works for real. Child profiles save to the database. User sees their own data.

- [ ] Wire Sign In screen to Supabase auth (Apple + Google + Email)
- [ ] Protected routes — unauthenticated → onboarding, authenticated → Home
- [ ] Create child profiles in Supabase (name required, birthday required, nickname optional)
- [ ] Auto-assign child colors from palette in order (Blue, Amber, Green, Plum, Teal, Rose)
- [ ] Edit and delete child profiles from Settings
- [ ] Child tabs on Home pull from real data
- [ ] Environment variables for all auth/service keys — nothing hardcoded

---

## Phase 5: Recording & Entries

Record → transcribe → save → view works end-to-end. The core product loop.

- [ ] Voice recording with `expo-speech-recognition` (`persist: true`, `requiresOnDeviceRecognition: true`)
- [ ] Real-time partial transcript displayed during recording
- [ ] 60-second auto-stop (hard cap for MVP)
- [ ] Recording → Entry Detail with transcript populated
- [ ] Save transcript + upload audio to Supabase Storage
- [ ] Auto-detect child names/nicknames from transcript → pre-fill child pills
- [ ] Auto-apply topic tags via keyword matching
- [ ] "Or write instead" → blank Entry Detail (text-only, same save flow minus audio)
- [ ] Date picker for backdating entries (reuse birthday picker component)
- [ ] Location capture with `expo-location` (auto-detect + manual override, stored as text label)
- [ ] Audio playback on Entry Detail (play/pause + scrub bar)
- [ ] Soft delete with 30-day recovery (Recently Deleted in Settings)
- [ ] Edge cases: mic denied, empty audio, transcription failure

---

## Phase 6: Search & Favorites

Browse, search, and curate entries with real data.

- [ ] Full-text keyword search against Supabase
- [ ] Child + tag + date range filter chips
- [ ] Date range presets (Last 7 days, Last month, Last 3 months, Custom)
- [ ] Highlighted search matches in result cards
- [ ] Core Memories screen pulls real favorited entries
- [ ] Inline audio play on Core Memory cards (stopPropagation)
- [ ] Heart toggle syncs to Supabase
- [ ] Empty states for no results and no favorites

---

## Phase 7: Notifications & Prompts

Daily habit loop drives nightly recording.

- [ ] Local scheduled notifications via Expo Notifications
- [ ] Personalized prompt with child name + age (e.g., "What made Emma smile today?")
- [ ] "Record" action → Recording screen; "Remind Me Later" → 30-minute snooze
- [ ] Tapping notification body → Home screen
- [ ] Prompt cards on Recording screen shuffled by child age range
- [ ] Notification time configurable in Settings

---

## Phase 8: Subscription & Paywall

Trial → paid conversion via RevenueCat.

- [ ] RevenueCat integration
- [ ] Paywall after first recording in onboarding (annual pre-selected, 7-day trial, dismiss button)
- [ ] Post-trial paywall — entries visible but locked *(see Product Spec §5)*
- [ ] Subscription status shown in Settings
- [ ] Apply for Apple Small Business Program (15% commission) before first sale

---

## Phase 9: Analytics & Delight

Measure what matters. Add warmth.

- [ ] PostHog event tracking across all features
- [ ] Key funnel: install → account → first child → first entry → day 7 → converted
- [ ] First Entry Celebration — Home banner + glowing card *(see Product Spec §4.2)*
- [ ] Memory Saved animation in onboarding (heart scale-in)
- [ ] First Memory Marker badge per child
- [ ] Age stamps on entries (auto-calculated from child birthday)
- [ ] Track: 60s cap hit rate, voice vs. text ratio, Core Memories usage, notification tap-through

---

## Phase 10: Pre-Launch

App Store ready.

- [ ] Accessibility audit (labels, touch targets ≥44pt, contrast ≥4.5:1, Dynamic Type)
- [ ] Performance targets (cold start <2s, transcription <5s, first entry <90s from install)
- [ ] App icon, splash screen, App Store screenshots
- [ ] Privacy policy + terms of service
- [ ] COPPA compliance review *(see Product Spec §8)*
- [ ] App Store listing (Lifestyle category — NOT Kids)
- [ ] TestFlight beta with 15-25 real parents → feedback → fixes → submission

---

## Milestones

| # | Milestone | What you can show | Phase |
|---|-----------|-------------------|-------|
| M1 | Skeleton | App launches, tap between all screens | 1 ✅ |
| M2 | Looks real | Screens match wireframes — tokens, texture, serif, warm palette | 2 ✅ |
| M3 | Auth works | Sign in, create child, see empty Home | 4 |
| M4 | Can record | Voice recording, breathing circle, 60s auto-stop, transcript | 5 |
| M5 | Core loop | Record → auto-detect child → save → browse → search → playback | 5–6 |
| M6 | Favorites | Core Memories with elevated cards, inline audio play | 6 |
| M7 | Habit loop | Personalized notifications drive daily recording | 7 |
| M8 | Money works | Trial → paywall → subscribe via RevenueCat | 8 |
| M9 | Beta | TestFlight in real parents' hands | 10 |
| M10 | Ship | App Store submission | 10 |

---

## Cost at Launch

| Service | Free Tier | Upgrade Trigger | Paid |
|---|---|---|---|
| Apple Developer | — | Day 1 | $99/yr |
| Supabase | 500MB DB, 1GB storage | ~500 users | $25/mo |
| RevenueCat | Up to $2,500/mo revenue | $2,500+ | % of MTR |
| PostHog | 1M events/mo | 1M+ | Usage-based |
| EAS Build | 30 builds/mo | Need more | $15/mo |

Total at launch: **~$99/year** (just Apple Developer).
