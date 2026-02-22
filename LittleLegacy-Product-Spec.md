# LittleLegacy — Full Product Specification
## Voice-First Memory Journal for Parents

---

## 1. Vision & Positioning

**One-liner:** A voice-first app that turns 60-second nightly recordings into a searchable, organized memory journal for each of your children.

**Core principle:** The parent's authentic voice is sacred. AI helps organize and prompt — it never rewrites, summarizes, or generates content on behalf of the parent.

**Target user (launch):** Moms of toddlers (ages 0-5). Highest memory-capture intent, already habituated to phone-based parenting tools.

**Emotional promise:** "You'll never forget the little things."

---

## 2. Core User Experience

### 2.1 Capture Flow — Two Paths

**Path A: Notification Capture (60 seconds)**
1. Push notification at user-selected time (set during onboarding based on bedtime)
2. Tap notification → app opens directly to recording screen
3. Tap record → speak → tap stop
4. Auto-transcription (on-device) + auto-detect child name/nickname from transcript
5. Entry dated today. Saved. Done.

**Path B: In-App Capture (intentional)**
1. Open app → select child's tab/book
2. Optional: browse a prompt suggestion ("What made you laugh today?")
3. Tap record → speak → tap stop (or tap text entry to type)
4. Review transcription, adjust child tag if needed
5. Optional: change entry date (defaults to today, but user can backdate for older memories)
6. Save

**Key design decisions:**
- Both voice and text input supported; voice is primary, text is always available
- Transcription happens on-device using native speech APIs (MVP)
- Cloud transcription (Whisper/Deepgram) as a V2 upgrade for accuracy
- Original audio is always preserved alongside the transcript
- Entries support voice + text only for MVP (no photos/video)

### 2.2 Onboarding Flow

**Approach: Set up child, then capture first memory**
1. Welcome screen — "Let's set up your first memory book"
2. Create child profile: name (required), nickname (optional — also used for auto-detection from transcript, e.g., "Bug"), birthday (optional), gender/pronouns (optional — enables gendered prompts), photo (optional)
3. "Now let's capture your first memory about [child name]"
4. User records their first entry → sees it transcribed into [child name]'s book
5. "When should we remind you?" → set notification time
6. "You're all set. [Child name]'s book has its first memory."

**Rationale:** Creating the child's profile first anchors the experience — the parent knows *whose* book they're writing in. The profile setup is lightweight (name only is required) so it doesn't feel like a form. The emotional payoff still comes quickly: seeing the first memory land in their child's named book.

### 2.3 Browse & Relive

**Primary view: Per-child tabs**
- Bottom tabs or swipeable sections, one per child
- Each child's view shows entries in a chat-row layout (similar to Claude web or iMessage)
- Each row shows: date, first line of transcript, topic tag
- Tap to expand: full transcript, play audio button, edit option

**Search:**
- Full-text keyword search across all transcripts
- Natural language query support ("When did Emma first walk?") — V2 via AI-powered semantic search
- Filter overlays: by child, date range, topic tag

### 2.4 Entry Detail View
- Full transcript text (editable by parent)
- Play audio button (original recording)
- Child tag(s) — tap to add/change
- Topic tags (auto-detected or manual): humor, milestone, first, school, sports, health, family, holiday, bedtime, sweet moment
- Date & time recorded
- Optional: mark as favorite/highlight

---

## 3. AI & Tagging System

### 3.1 Auto-Tagging (V1)
- **Child detection:** Parse transcript for child names AND nicknames, auto-tag to the correct child's book. Default to most recently viewed child if ambiguous. Allow multi-tagging for sibling moments.
- **Topic classification:** Lightweight NLP or keyword matching to assign topic tags from a base taxonomy (milestone, humor, first, etc.)
- Tags are applied silently — no confirmation step required (user can adjust later)

### 3.1.1 AI-Generated Custom Tags (V2)
When LLM tagging is active, the model can suggest NEW tags beyond the base taxonomy if none of the existing tags fit well. Over time, each user's tag library grows organically based on their content. For example, if a parent records frequently about swimming lessons, the AI creates a "swimming" tag.

**Data model implication:** Tags are stored in a database table (not hardcoded) with a `source` field: `system` (base taxonomy), `ai-generated`, or `user-created`. This allows the taxonomy to expand per-user without code changes.

### 3.2 AI Boundaries (Core Principle)
- AI NEVER rewrites, paraphrases, or summarizes parent's words
- AI NEVER generates content that appears as the parent's voice
- AI CAN: suggest prompts, classify/tag entries, power search, detect child names, surface "on this day" memories
- Prompts are pre-generated on the backend (AI-assisted brainstorming), curated, then rotated in the app — not generated in real-time

### 3.3 LLM Tagging Pipeline (V2 Implementation)

MVP uses lightweight keyword matching / on-device NLP for topic tags. When upgrading to LLM-based tagging (targeting V1.5/V2), the pipeline works as follows:

**Provider:** Anthropic Claude API (Haiku model) — best cost/quality ratio for classification tasks.

**Flow:**
1. Entry saved with transcript text
2. Text sent to Claude Haiku with classification prompt + tag taxonomy
3. Model returns JSON array of tags with confidence scores
4. Tags above 0.7 confidence are auto-applied silently
5. Tags between 0.5–0.7 are applied but flagged for potential manual review in future versions
6. Manual tag overrides by users are stored as ground-truth training signal

**Example Prompt:**
```
System: You are a family memory tagger. Given a parent's journal entry about
their child, return the most relevant tags from this taxonomy: [humor, milestone,
sports, school, health, birthday, holiday, family, friendship, creativity, nature,
food, bedtime, travel, other]. Return JSON: [{"tag": "humor", "confidence": 0.92}].
Max 3 tags.

User: "Liam tried to put his shoes on the wrong feet today and then walked around
the house like a penguin for 10 minutes. He was cracking up the whole time."

Expected output: [{"tag": "humor", "confidence": 0.95}, {"tag": "milestone", "confidence": 0.55}]
```

**Cost estimate:** ~$0.002 per entry at Haiku pricing. At 5 entries/user/week, tagging costs ~$0.04/user/month — well within subscription margin.

**Implementation notes:**
- Tagging prompt should be versioned and stored in a config table (not hardcoded) to enable A/B testing
- Tag taxonomy should be a database table with a version field, allowing expansion without code deploys
- All entry processing (transcription, tagging) must be idempotent — safe to retry on failure
- Only entry text is sent to the AI provider — no child names, user identifiers, or audio files
- Entry text is not used for model training (per Anthropic's API data policy)

---

## 4. Notification & Habit Design

**Philosophy:** This is NOT a streak app. Even one memory per week is valuable. The notification is a gentle convenience, never a guilt mechanism.

**Notification behavior:**
- User sets preferred time during onboarding (suggestion: 30 min after reported bedtime)
- Adjustable in settings at any time
- Notification copy rotates gently: "How was [child name]'s day?" / "Any moment worth remembering today?"
- If ignored for multiple days, reduce frequency — never increase pressure
- No streak counters, no "you missed X days" messaging

**Missed days:**
- Allow backdating entries anytime ("Record a memory from another day")
- No empty-day markers or guilt-inducing gaps in the timeline
- Weekly catch-up prompt (optional): "Anything from this week worth capturing?"

---

## 5. Monetization

### 5.1 Subscription Model
- **Free trial:** 7-14 days, full access to all features
- **After trial:** $3/month or $30/year (annual = 2 months free)
- **Paywall behavior:** Entries recorded during trial become visible but locked (see dates, child names, first few words — but cannot play audio or read full text). This creates loss aversion and is the highest-converting approach for emotional data.
- **Win-back email:** "You recorded [X] memories about [child name] during your trial. They're waiting for you."

### 5.2 Keepsake Books (V2+ Revenue)
- Print-on-demand physical books compiled from entries
- Auto-generated yearly book suggestion ("Emma's Year 2 Book — 147 memories")
- Custom book builder: parent selects which entries to include, arranges order
- Revenue model: cost + margin on each book printed
- Strategic value: deepens emotional investment and creates a physical artifact that reinforces the app's value

### 5.3 Pricing Philosophy
- Avoid over-complicating tiers — one subscription level, not multiple SKUs
- Don't nickel-and-dime on features like audio storage or number of children
- The subscription unlocks everything; the book is an add-on purchase

---

## 6. Family Sharing Roadmap

### Phase 1 — MVP
- Single user (one parent) per account
- One journal with multiple children (tab per child)

### Phase 2 — Partner Sharing
- Invite partner to the same account
- Both parents can add entries to any child's book
- Entries show which parent recorded them
- Partner must approve/accept invitation (no unilateral access)

### Phase 3 — Extended Family
- Share a link (one-time or ongoing) for grandparents, aunts, etc.
- Contributors can add entries tagged to specific children
- Owner (parent) approves contributions before they appear in the book
- Potential: read-only sharing for family members who just want to browse

---

## 7. Feature Roadmap

### MVP (Month 1-3) — Core Loop
- [ ] Voice recording with on-device transcription
- [ ] Text entry (type instead of speak)
- [ ] Audio preservation (keep original recordings)
- [ ] Child profiles (name, birthday, photo)
- [ ] Per-child tab/book view with chat-row layout
- [ ] Entry detail view (transcript, audio playback, edit)
- [ ] Push notification at user-selected time
- [ ] Full-text keyword search
- [ ] Basic auto-tagging (child detection + topic)
- [ ] Onboarding: record first → then setup
- [ ] Free trial (7-14 days) → subscription paywall
- [ ] User authentication + cloud sync (entries persist across reinstalls)
- [ ] Backdating entries (date picker on in-app capture path; notification path defaults to today)

### V1.5 (Month 4-6) — Retention & Polish
- [ ] "On this day" memory resurfacing (1 year ago today)
- [ ] Milestone celebrations (auto-detect firsts, birthdays)
- [ ] Developmental prompts by age (age-appropriate prompt suggestions)
- [ ] Prompt rotation system (pre-generated, curated prompts)
- [ ] Improved transcription (cloud fallback for low-confidence entries)
- [ ] Entry favoriting / highlights
- [ ] Weekly catch-up prompt for inactive users
- [ ] LLM-powered auto-tagging upgrade (Claude Haiku — see Section 3.3)
- [ ] Share individual entries — tap share to generate a read-only link with entry text, child name, date, and audio playback; shareable via native share sheet

### V2 (Month 6-12) — Growth & Expansion
- [ ] Partner sharing (two parents, one account)
- [ ] "Memory Sparks" — import photo from camera roll, app prompts "What was happening here?"
- [ ] Natural language search ("When did Emma first ride a bike?")
- [ ] Annual highlight reel (auto-compiled best entries)
- [ ] Keepsake book builder + print-on-demand integration
- [ ] Extended family sharing via invite links
- [ ] Shared entry management — view all shared entries, revoke links from settings
- [ ] Shared entry web page includes subtle LittleLegacy branding + "Capture your family's memories" CTA (organic acquisition loop)

### V3+ (Year 2) — Platform
- [ ] "Interview Mode" — guided Q&A to record the child's own answers
- [ ] Collaborative family timeline
- [ ] Foster care adaptation (structured documentation, agency partnerships)
- [ ] Export options (PDF, full data export)
- [ ] Offline recording with background sync

---

## 8. Data & Privacy

### Principles
- User data is never sold, mined, or used for advertising
- Entries are encrypted at rest and in transit
- Cloud sync is required (entries must survive app deletion/reinstall)
- COPPA considerations: the app stores data *about* children but is used *by* parents — legal review needed for compliance posture
- All entries are treated equally — no special "sensitive" flagging (parent decides what to record)

### Data Architecture
- User account with auth (email or social login)
- Child profiles linked to user account
- Entries linked to child profiles + user account
- Audio files stored in cloud object storage (S3/equivalent)
- Transcripts stored in searchable database
- Tags as structured metadata on entries

### Data Portability
- Full data export (text + audio) available to users at any time
- This is a trust signal and should be prominently communicated

---

## 9. Non-Functional Requirements

These are the performance, security, and quality targets that apply at MVP. More detailed NFRs can be added as the product scales.

### Performance
- **NFR-001:** App cold start to home screen in ≤2 seconds on devices from 2020 or newer
- **NFR-002:** Voice transcription completes within 5 seconds for entries ≤60 seconds; within 15 seconds for longer entries
- **NFR-003:** Search results return within 1 second for libraries of up to 5,000 entries

### Security & Privacy
- **NFR-004:** All data in transit encrypted via TLS 1.3. All data at rest encrypted (AES-256 or equivalent)
- **NFR-005:** Audio files and entry text stored in user-isolated data partitions. No user's data is accessible to another user except via explicit sharing (V1.5+)
- **NFR-006:** COPPA — the app stores data *about* children but the parent is the account holder and data subject. Legal review required to confirm this interpretation before launch

### Accessibility
- **NFR-007:** All interactive elements have accessible labels (e.g., "Record a new memory", not just an icon)
- **NFR-008:** Minimum touch targets: 44x44pt (iOS) / 48x48dp (Android)
- **NFR-009:** Voice recording includes visual feedback (waveform + timer) for users who cannot hear audio playback
- **NFR-010:** Support for Dynamic Type (iOS) and font scaling (Android)
- **NFR-011:** Color contrast ratio ≥4.5:1 for all text

---

## 10. Technical Stack (Confirmed)

### Platform
- **iOS-first launch.** Target demographic (moms of toddlers) skews heavily iPhone. Android can follow using the same React Native codebase once MVP is validated.

### Frontend
- **React Native + Expo (TypeScript)** — single codebase, familiar to React web devs, Expo handles builds/OTA updates/app store submission via EAS
- **UI:** NativeWind (Tailwind CSS for React Native) — fastest path for a solo dev coming from web React
- **State management:** Zustand — lightweight, minimal boilerplate, scales better than Context for multiple state domains (auth, entries, children, UI)
- **Speech-to-text:** `@react-native-voice/voice` — wraps Apple Speech framework, real-time streaming transcription, zero cost, most battle-tested RN speech library

### Backend
- **Supabase (direct client SDK)** — PostgreSQL + Auth + Storage + Row Level Security. App talks to Supabase directly; Edge Functions handle server-side logic (tagging pipeline, background processing). No custom API layer for MVP.
- **Auth:** Apple Sign-In + Google Sign-In + email/password (Apple is required for iOS apps offering social login)
- **Audio storage:** Supabase Storage (S3-compatible). Pro plan ($25/mo) includes 100GB — sufficient for 1,000+ users at compressed audio sizes.
- **Audio format:** AAC (.m4a) — native iOS support, ~100KB per 60-second entry. Best balance of quality, file size, and compatibility. At 1,000 users × 5 entries/week, that's ~2GB/month new storage.

### Notifications
- **Local scheduled notifications** via Expo Notifications for MVP. Set once on device at user's chosen time, fires daily. Prompt text drawn from a static pool bundled in the app. Upgrade to server-sent push for personalized content in V1.5+.

### Payments
- **RevenueCat** — wraps Apple/Google in-app purchases with unified API. Handles receipt validation, trial management, subscription lifecycle, and basic analytics. Free tier covers up to $2,500/mo in MTR.

### Analytics
- **PostHog** — open source, generous free tier (1M events/mo), privacy-friendly. Good alignment with the app's privacy-first positioning. Tracks retention, funnel analysis, and custom events.

### AI Tagging (MVP → V2)
- **MVP:** Keyword matching + lightweight NLP for topic classification
- **V2:** Anthropic Claude API (Haiku) for LLM-based classification (see Section 3.3)

### Development & Deployment
- **IDE:** VS Code + Claude Code CLI
- **Version control:** Git + GitHub
- **Builds:** Expo EAS Build (cloud builds for iOS without needing a Mac for CI)
- **Updates:** Expo OTA updates for JS-only changes; App Store submission for native changes
- **Testing device:** iOS Simulator (note: Simulator cannot record audio from mic — need test audio files or physical device for voice testing)

### Print-on-demand (V2)
- Lulu API or Blurb API for book generation

### Why this stack:
- React Native / Expo is the only option that gives a solo web dev a native iOS app in 3 months
- Supabase direct (vs. custom API layer) eliminates ~80% of backend code — auth, storage, real-time, and RLS are built in
- The entire stack is TypeScript end-to-end (app, Edge Functions, database types) — one language to think in
- Supabase + Expo + RevenueCat is the most common indie-dev stack for subscription mobile apps right now

---

## 11. Competitive Positioning

### What exists today
- **Baby tracker apps** (Huckleberry, Baby Tracker): Focus on feeding/sleep schedules, not memories. Stop being useful after infancy.
- **Generic journals** (Day One, Journey): No child-linking, no voice-first, no family sharing, no keepsake books.
- **Social media** (Instagram, Facebook): Memories buried in algorithmic feeds, mixed with non-family content, privacy concerns.
- **Physical notebooks:** Effective but unsearchable, unshared, and can't preserve the parent's voice.

### LittleLegacy's wedge
- Voice-first input is the primary differentiator — no competitor leads with voice
- Child-linked, tagged entries create structure that generic journals lack
- Audio preservation means grandchildren could someday hear their grandparent's voice describing the day they were born
- Keepsake book as an output creates a tangible artifact that deepens emotional lock-in

### Competitive moat
- **Data lock-in:** After 1-2 years of daily/weekly memories, switching cost is enormous
- **Brand/community:** Position as the trusted, privacy-respecting home for childhood memories
- **Emotional lock-in:** The audio recordings create irreplaceable value — you can't export your voice to another app and get the same experience

---

## 12. Growth Strategy

### Phase 1: Seed (Month 1-3)
- Personal network: family, friends with young kids
- Mom Facebook groups, Reddit (r/Mommit, r/Parenting, r/toddlers)
- Organic posts showing the product in action (screen recordings of recording → playback)

### Phase 2: Expand (Month 4-8)
- Micro-influencer partnerships: parenting TikTok/Instagram creators
- Content marketing: blog posts on childhood memory preservation
- App Store Optimization (ASO): target "baby journal", "memory book", "parenting journal" keywords

### Phase 3: Scale (Month 9-12+)
- Referral program (invite a parent friend, both get a free month)
- Keepsake book as viral artifact (parents share photos of their printed book → organic awareness)
- Partnership channel: parenting subscription boxes, pediatrician office flyers

---

## 13. Success Metrics

### North Star
- **Monthly active recording users** — users who record at least 1 entry per month

### KPIs to track from day one
- Trial → paid conversion rate (target: 40%+)
- Entries per user per week (target: 3+)
- Day 7 / Day 30 retention
- Time to first entry (should be < 2 minutes from install)
- Audio vs. text entry ratio (validates voice-first thesis)
- Search usage (validates that users come back to browse)

---

## 14. Open Questions

- [ ] **Name:** "LittleLegacy" is a working title — explore alternatives
- [ ] **Visual tone:** Somewhere between warm/nostalgic and elegant/timeless — needs design exploration and mood boards
- [ ] **Free trial length:** 7 vs. 14 days — A/B test once live
- [ ] **COPPA compliance:** Legal review needed for storing data about children
- [ ] **Audio storage costs:** Model the per-user storage cost at scale (1 entry/day x 60 seconds x 1,000 users)
- [ ] **Platform:** Launch iOS-only or iOS + Android simultaneously?

---

## 15. Risks to Review

Key risks from the standard PRD worth revisiting before launch. Not fully specced yet — flagged for future review.

| Risk | Severity | Likelihood | Potential Mitigation |
|------|----------|------------|---------------------|
| Users don't sustain journaling habit past week 1 | High | High | Prompts reduce blank-page friction; notifications are gentle; wrap-ups reward sustained use |
| Voice transcription quality is poor (accents, background noise) | Medium | Medium | Allow text editing of all transcriptions; save original audio as fallback; evaluate cloud STT for V2 |
| COPPA / child privacy compliance issues | High | Medium | Legal review before launch; parent is data subject (not child); no child-identifiable data sent to LLM |
| Subscription fatigue — users won't pay $3/mo | High | Medium | Visible-but-locked paywall creates FOMO; pricing is below most family apps; test $2.99 vs $3.99 in early cohorts |
| Third-party API dependency (Whisper, Claude) | Medium | Low | Abstract transcription and tagging behind service interfaces; can swap providers without app changes |
| Contributor link abuse or spam (V2) | Low | Low | Links are scoped, labeled, and revocable; rate limiting on submissions |

---

## 16. Brainstorm Parking Lot

Features that came up in discovery but aren't prioritized yet:

| Feature | Description | Priority | Notes |
|---------|-------------|----------|-------|
| Time Capsule entries | Record a message that "unlocks" at a future date (age 18, graduation) | Medium | High emotional appeal but complex UX |
| Interview Mode | Guided Q&A to record the child's own voice/answers | Medium | Strong differentiator, adds child's perspective |
| Memory Sparks | Import photo from camera roll, app prompts "What was happening here?" | High | Selected as V2 feature — bridges photo + voice |
| Collaborative timeline | All family members see a shared timeline of entries | Medium | Requires family sharing infrastructure |
| Annual highlight reel | Auto-compiled year-in-review with top entries | High | Selected as V2 feature — strong retention hook |
| Developmental prompts | Age-specific prompt suggestions | High | Selected as V1.5 feature |
| Gratitude/reflection mode | Weekly prompt for grateful parenting moments | Low | Nice but not core |
| Sibling comparison | Side-by-side view of Child A at age 3 vs. Child B at age 3 | Low | Fun but niche |
| Mood/emotion tagging | Tag entries with child's mood that day | Low | User chose to treat all entries equally |
| Photo of the day | Optional daily photo attachment | Medium | Deferred — keeping MVP to voice + text |
| Letter to future child | Record a message for your child to hear someday | Medium | Overlaps with Time Capsule concept |
