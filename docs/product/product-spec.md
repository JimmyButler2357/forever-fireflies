# Core-Memories — Full Product Specification (v2)
## Voice-First Memory Journal for Parents

Updated to reflect wireframe iterations through v13. Sections covering the core user experience (2.1–2.5), onboarding (2.2), and notification design (4) have been revised to match the current wireframe. Backend, roadmap, and future feature sections remain intact with minor alignment updates.

---

## 1. Vision & Positioning

**One-liner:** A voice-first app that turns 60-second nightly recordings into a searchable, organized memory journal for each of your children.

**Core principle:** The parent's authentic voice is sacred. AI helps organize and prompt — it never rewrites, summarizes, or generates content on behalf of the parent.

**Target user (launch):** Moms of toddlers (ages 0-5). Highest memory-capture intent, already habituated to phone-based parenting tools.

**Emotional promise:** "You'll never forget the little things."

---

## 2. Core User Experience

> **Detailed screen-by-screen specifications:** See [`app-workflow.md`](../design/app-workflow.md) for the complete App Workflow (v4) — 8 onboarding screens + 7 main app screens + push notification, with full layout descriptions, states, interaction details, and navigation flows.

### 2.1 Capture Flow — Two Paths

**Path A: Notification Capture (60 seconds)**
1. Push notification at user-selected time (set during onboarding)
2. Tap "Record" → app opens directly to Recording screen
3. Tap mic → speak → tap stop (or auto-stop at 60 seconds)
4. App transitions directly to Entry Detail with transcript populated
5. Auto-detection pre-fills child pills from transcript; parent adjusts if needed
6. Entry dated today. Auto-saved. Done.

**Path B: In-App Capture (intentional)**
1. Open app → optionally filter by child tab
2. Optional: tap mic to browse prompt cards before recording
3. Tap mic → speak → tap stop (or auto-stop at 60 seconds)
4. App transitions directly to Entry Detail with transcript populated
5. Review transcription, adjust child tag via ×/+ pills if needed
6. Optional: change entry date (defaults to today, but user can backdate for older memories)
7. Auto-saved — no save button

**Path C: Text Entry**
1. Open app → tap "or write instead" below the mic button
2. App opens a blank Entry Detail screen (no audio, just text editor)
3. Type the memory, select child via pills, add tags
4. Auto-saved

**Recording duration:**
- 60 seconds is the default auto-stop. "Just 60 seconds" is the core marketing message — it keeps perceived commitment minimal and maximizes nightly habit formation
- The wireframe implements a hard stop at 60 seconds with no extension. A "Keep Going" extension to 3 minutes may be added post-MVP if user feedback indicates entries feel truncated. Track the % of entries hitting the 60-second cap to inform this decision
- 3 minutes would be the hard cap if added. Constraints breed focus — these entries are more emotionally potent when re-read years later than long-form narration

**Post-recording flow (simplified from earlier design):**
- Earlier versions had a full-screen child-selection step between Recording and Entry Detail. This was removed to reduce post-recording friction. The app now goes directly to Entry Detail, where auto-detection pre-fills child pills and the parent corrects inline if needed. This is faster and keeps the capture flow under 90 seconds.

**Key design decisions:**
- Both voice and text input supported; voice is primary, text is always available as a secondary option ("or write instead" link, clearly subordinate to the mic button)
- Transcription happens on-device using native speech APIs (MVP) — zero cost, cross-platform, ~85-90% accuracy in good conditions
- Cloud transcription as a V2 upgrade for accuracy (see Section 2.1.1)
- Original audio is always preserved alongside the transcript — no information is ever lost, and transcripts are always editable
- Entries support voice + text only for MVP (no photos/video)

### 2.1.1 Cloud Transcription Upgrade Path (V2)

Ship native on-device transcription for MVP. Monitor these signals to decide when/whether to add cloud transcription:
- User feedback or support tickets consistently citing transcription accuracy
- High transcript edit rates (track edits per entry as an analytics metric)
- Churn analysis reveals transcription quality as a factor in drop-off
- Whisper-mode or noisy-environment entries producing unusable transcripts

**When upgrading, use a hybrid duration approach to cap costs:**
- Entries ≤60s → send audio to Deepgram Nova-2 in background, silently replace native transcript with higher-quality version
- Entries >60s (if extended recording is added) → keep native on-device transcript (free, already displayed to user)
- Offline → keep native transcript with "tap to improve" re-transcription option when back online
- This caps cloud cost at 60s per entry regardless of total recording length

**Why Deepgram over Whisper API:** ~28% cheaper ($0.0043/min vs. $0.006/min), faster response times, $200 free credit to start, comparable accuracy. At 10K users with the hybrid approach, blended transcription cost is ~$1,670/month (3.3% of revenue).

**Why NOT on-device Whisper (whisper.rn):** Adds 74-244MB to app bundle, slower on older devices, community-maintained bindings. Not worth it when platform-native APIs are free and adequate, and cloud APIs are cheap and superior when needed.

### 2.2 Onboarding Flow

**Approach: Set up child first, then capture first memory**

The onboarding flow is 9 screens, designed to get the parent to their first saved entry in under 90 seconds while establishing the emotional tone.

1. **Sign In** — Apple Sign-In, Google Sign-In, or Email. Georgia serif title "Core Memories" with tagline "You'll never forget the little things." Legal links below auth buttons.
2. **Add Child** — Name (required), birthday (required — powers age stamps on every entry), nickname (optional — used for voice auto-detection). All fields visible upfront, no progressive disclosure. Birthday uses an inline styled scroll wheel picker (Month/Day/Year) within the card to maintain the app's warm aesthetic. Parents can add multiple children before proceeding — added children appear as colored pills above the form.
3. **Mic Permission** — Pre-permission primer explaining *why* before iOS system prompt. "Nothing is ever recorded without you pressing the button."
4. **Notifications** — Set nightly reminder time. Scrollable time picker with 30-minute increments, 8:30 PM default. Framed as "a gentle nudge at bedtime," not a notification. Skip option available.
5. **First Recording** — Personalized prompt with child's name, pulsing mic button with warm radial gradient backdrop. "Or write instead" text fallback. 60-second limit.
6. **First Memory (Text)** — Alternative to voice for step 5. Georgia serif text area with child pre-populated.
7. **Memory Saved** — Emotional payoff. Heart animation, "[Child name]'s first memory, saved." and "Your voice and your words — kept forever." Intentionally minimal — do not add to this screen.
8. **Welcome Preview** — Shows what the app looks like with months of data: a populated Home feed with multiple entries, the Core Memories screen with favorites, and the Search screen finding a specific moment. Gives the parent a vision of what they're building toward before being asked to subscribe. Static mockup with sample data — not the user's actual entries.
9. **Paywall** — Convert to trial subscriber after experiencing core value. Annual/monthly pricing (annual pre-selected), 7-day free trial, visible dismiss button, restore purchase link. Exits to Home in the first-entry celebration state.

**Key changes from earlier design:**
- Child setup comes *before* first recording (not after). Creating the child's profile first anchors the experience — the parent knows *whose* book they're writing in.
- Birthday is now required (was optional). It gates the continue button and powers the age stamp that appears on every entry and in the notification prompt.
- Onboarding requires saving at least one entry before paywall. This ensures every user has content from the start and experiences the core value proposition before being asked to pay.
- The paywall exits to a "first-entry" celebration state on Home, not the standard Home view.

### 2.3 Browse & Relive

**Primary view: Home screen with per-child tabs**
- Top bar with app title (Georgia serif), search icon (→ Search), heart icon (→ Core Memories), settings gear. In first-entry state, only settings icon is shown — search and heart are hidden
- Horizontal scrollable child tabs below the top bar: "All" (default, shows every child's entries) plus one tab per child, color-coded with the child's assigned color
- Single-child variant: when only one child is registered, tabs are replaced by a warm pill showing the child's name, age, and memory count
- Entry cards in reverse-chronological order: child name pills (colored dot + name), date, time, 2-line transcript preview, tag pills. Favorited entries get a warm orange glow border and filled heart
- Gradient fade at the bottom transitioning to the mic button and "or write instead" link

**Core Memories screen (favorites):**
- A visually elevated view of favorited entries — warmer gradient background, Georgia serif title, memory count, larger cards with 3-line serif transcript previews, inline audio play buttons on each card. This screen should feel like opening a treasure box, not filtering a list. See App Workflow v4 for full specification.

**Search:**
- Full-text keyword search across all transcripts with auto-focus
- Filter chips: child name (multi-select, colored), tags, date range (presets: Last 7 days, Last 30 days, Last 3 months, All time)
- Result cards with highlighted search matches
- Natural language query support ("When did Emma first walk?") — V2 via AI-powered semantic search
- Warm empty state when no results match

### 2.4 Entry Detail View

The Entry Detail screen serves both new entries (from recording or text input) and existing entries (from Home, Search, or Core Memories). All edits auto-save — no save button.

**Layout (always stacked — four metadata lines):**

Line 1: Date (bold) and time (muted). Tapping the date opens an inline scroll-wheel date picker (reuse the same component as the birthday picker in onboarding). Defaults to today for new entries; shows the entry's saved date for existing entries. This enables backdating — recording a memory that happened yesterday, last week, or any past date.

Line 2: Location (muted text, optional). Shows the auto-detected location label (e.g., "Tampa, FL") or "Add location" placeholder. Tapping opens a text input where the parent can type any location name — no map or GPS picker, just a free-text field. Auto-detect runs silently at recording time using the device's location, converting coordinates to a readable place name. Parent can edit or clear at any time.

Line 3: Child pills — colored dot + name + × for each tagged child. A + button opens the child picker (hidden when all children already tagged). Each pill's × removes that child. The × on the *last* remaining pill triggers swap mode instead of removal (zero-child state is blocked).

Line 4: Age line — each child's age at the time of the entry in muted text (e.g., "Emma 2y 4m · Liam 4y 1m").

**Child picker:** Inline panel with toggle pills for all children. Stays open for multi-select. Tap outside (e.g., on the transcript) to close, as long as at least one child is selected. Checkmarks on selected children. Swap mode shows "Switch from [name]:" context when triggered by the last pill's ×.

**Auto-detection:** When an entry arrives from a recording, the app analyzes the transcript and pre-fills child pills. If multiple children are detected (lower confidence), a subtle "Auto-detected · tap × to remove or + to add" hint appears. This hint is only shown for low-confidence auto-detection.

**Tags row:** Small tag pills with × for removal, + to add. Tag editor panel shows text input and "Your Frequent Tags" section.

**Transcript:** Editable text area styled with Georgia serif font, paper texture background, and warm border. Full transcription for voice entries; placeholder text for new text entries.

**Audio playback:** Mini-player bar at the bottom with play button and scrub bar. Hidden for text-only entries.

**Heart toggle:** Tap to mark/unmark as a Core Memory (stays on this screen).

**Delete:** Trash icon in top bar → confirmation dialog. Always a soft delete with 30-day recovery. "Entries are kept for 30 days" note in the dialog. Recently Deleted section in Settings shows soft-deleted entries with a "Delete forever" option for manual permanent deletion and a "Restore" option.

**Post-recording banner:** When arriving from a recording, a "Memory saved" banner with heart icon auto-dismisses after a few seconds with a fade-out and collapse animation.

### 2.5 Audio Consumption Strategy

**Text-first, audio-second:** Daily browsing happens through transcriptions — faster to scan than listening to sequential recordings. The original audio is always one tap away for the emotional deep-dive. Parents won't sit and listen to 15 recordings back-to-back, but they will tap play on a specific entry that catches their eye in text form.

**Core Memories as audio browse:** The Core Memories (favorites) screen includes inline audio play buttons on each card, allowing parents to listen to their best memories without opening Entry Detail. This creates a more immersive browsing experience for the curated collection. Tapping the play button area stays on the Core Memories screen (stopPropagation); tapping the card text navigates to Detail.

**Family contributor recordings change the equation:** A parent's own voice narrating is reflective and valuable, but hearing grandma describe meeting the baby or uncle Dave's reaction to the first steps — that's content parents actively seek out and replay. The record request feature (V2) transforms the archive from "just me talking" into a chorus of family voices, which is far more compelling to consume and becomes irreplaceable over time.

**Value compounds over time:** A mundane bath time entry today becomes a time capsule in three years when that routine no longer exists. The product's emotional value increases the longer someone uses it — this is both the core retention mechanism and the primary marketing hook. The message isn't "listen tonight" — it's "in five years, you'll be grateful these exist."

---

## 3. AI & Tagging System

### 3.1 Auto-Tagging (V1)
- **Child detection:** Parse transcript for child names AND nicknames, auto-tag to the correct child's book. Auto-detection runs automatically when an entry arrives from recording — results pre-fill child pills on the Entry Detail screen. Parent corrects inline if wrong. Allow multi-tagging for sibling moments.
- **Topic classification:** Lightweight NLP or keyword matching to assign topic tags from a base taxonomy (milestone, humor, first, etc.)
- Tags are applied silently — no confirmation step required (user can adjust later via tag row on Entry Detail)

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

**Notification design (updated to match wireframe):**
- User sets preferred time during onboarding (step 4 — time picker with 8:30 PM default)
- Adjustable in Settings at any time
- **Personalized prompt:** Notification uses the child's name and age — "What made Emma smile today?" with a secondary line: "[Child name] is [age] old — these days go fast." Age format auto-adjusts based on child's age (e.g., "2 years" for toddlers, "2 years, 4 months" when months add meaningful context). The prompt text rotates nightly from a curated bank.
- **Action buttons:** "Record" (accent orange, opens Recording screen directly) and "Remind me later" (neutral, 30-minute fixed snooze). No "Open App" button — tapping the notification body itself opens to Home.
- **Warm visual treatment:** The notification card has a warm gradient background to distinguish it from standard system notifications.
- If ignored for multiple days, reduce frequency — never increase pressure
- No streak counters, no "you missed X days" messaging

**Missed days:**
- Allow backdating entries anytime ("Record a memory from another day")
- No empty-day markers or guilt-inducing gaps in the timeline
- Weekly catch-up prompt (optional): "Anything from this week worth capturing?"

### Recap Emails (V1.5 / V2)

**Weekly recap (V1.5):** Primarily text-based. Clean digest of the week's transcribed entries with attached photos and age stamps. Designed to be quick to scan and easy to forward to grandparents. Reinforces the journaling habit by showing the parent what they captured.

**Monthly recap (V1.5):** Adds an audio highlight reel. Top 3-5 entries with embedded audio players alongside transcribed text and photos. Includes a "voices this month" section featuring recordings from family contributors (grandparents, spouse, etc.). This is where audio consumption starts to feel rewarding.

**Yearly recap — "Year in Memories" (V2):** The big emotional event. Beautifully designed summary with curated audio clips from across the year, growth stats ("you recorded 247 memories this year"), month-by-month highlights, and a prompt to record a year-end "letter to [child]" reflection. Timed to arrive near subscription renewal as a powerful retention trigger.

---

## 4.2 Emotional Moments & Delight Features

Small, intentional touches that give the app warmth and make key moments feel special. These are approved — each one is scoped enough to build.

### First Entry Celebration (Implemented in Wireframe)

After completing onboarding, the parent lands on a "first-entry" state of the Home screen. A gradient celebration banner reads "Your first memory is saved" with encouraging body text. Below, the single entry appears in a card with a warm glow border. Search and Core Memories icons are hidden to keep the focus on the moment. This state is reached directly from the paywall exit.

The earlier onboarding flow also includes a dedicated "Memory Saved" screen (step 7) — heart animation, child's name, "kept forever" — as the immediate emotional payoff before the paywall.

**Phase:** MVP (implemented in onboarding flow + home first-entry state)

### "On This Day" Resurfacing Card

When an old memory resurfaces (one year ago today), it gets a special card treatment that visually breaks from regular entries. Warm gradient background (cream to soft peach), a subtle accent bar along the top edge, a small calendar icon, and a label like "One year ago today" in uppercase. Entry text renders in serif italic to feel distinct. Appears at the top of the timeline feed when triggered.

**Phase:** V1.5 (see roadmap item)

### Milestone Badge

When the AI detects a milestone entry ("first steps," "first word," "slept through the night"), the entry card gets a small illustrated star badge (~16–22px) near the tags. Warm orange/gold toned, line-art style matching the app's illustration language. Subtle enough that a timeline with many entries doesn't look cluttered. Also applies to Core Memory (favorited) entries — a Core Memory that is also a milestone gets both the warm glow border and the star badge.

**Phase:** V1.5 (see roadmap item — milestone celebrations)

### Age Milestone Markers in Timeline

When scrolling a child's entries and crossing a birthday boundary (e.g., entries at 1y 11m transition to 2y 0m), a small divider card is inserted between entries. Shows the child's name and age ("Emma turned 2") with a tiny illustrated cake/candle icon. Centered between horizontal rules. These act as natural chapter breaks in the timeline and give small emotional moments while browsing. Only appears in per-child filtered views — not in the "All" tab, where interleaved children would make the dividers confusing.

**Phase:** V1.5

### "First Memory" Marker

When a new child is added and their first entry is saved, that card gets a permanent subtle ribbon or badge labeled "First memory." It's always the last card when you scroll to the bottom of that child's tab — like the first page of their book. The badge uses the child's assigned color (e.g., Emma's blue, Liam's amber) so it feels personal to that child's journal.

**Phase:** MVP (fires on first entry per child)

### "Ink Reveal" Transcript Animation

When a voice recording gets transcribed, instead of the text just appearing, it "writes itself" onto the page — like ink appearing on parchment. Think of the Marauder's Map from Harry Potter: words materializing out of nothing.

**How it works:**
- Words fade in left-to-right across each line, sequenced so earlier words appear before later ones
- A slight blur-to-sharp effect accompanies each word, like wet ink drying on paper
- The entire animation plays over ~2–3 seconds (total duration TBD during implementation)
- Only triggers on voice transcripts — not text entries (the parent already saw those words as they typed them)
- Only plays on first view of a transcript — after that, the text is just there. Requires a per-entry `transcript_seen` flag to track

**Why it matters:** The moment "your voice became words" is the core magic of the app. This animation makes that transformation feel genuinely special instead of instantaneous and forgettable.

**Reduced motion:** When the device's Reduce Motion setting is enabled, skip the animation entirely and show the transcript immediately (per NFR-013).

**Phase:** V1.5

### "Quiet Week" Prompt

If someone hasn't recorded in 7+ days and opens the app, a gentle interstitial appears before the normal feed: "It's been a little while. Anything from this week worth remembering?" with a mic button right there. Tone is warm, not guilt-inducing — a hand back in, not a guilt trip. A "not right now" dismissal takes them straight to their normal feed. Only triggers once per inactive stretch — if they dismiss it and don't record, it doesn't show again the next day.

**Phase:** V1.5 (see roadmap item — weekly catch-up prompt)

---

## 5. Monetization

### 5.1 Subscription Model
- **Free trial:** 7-day trial (implemented in wireframe paywall), full access to all features. A/B test 14-day variant once live.
- **After trial:** $5.99/month or $49.99/year (launch pricing — ~3.5 months free on annual). Annual plan pre-selected in the paywall with a "Save 30%" badge.
- **Price testing:** Use RevenueCat Experiments to A/B test $4.99 and $6.99 monthly variants once there's enough traffic. You can always lower a price; raising it after launch is much harder.
- **Paywall behavior:** Entries recorded during trial become visible but locked (see dates, child names, first few words — but cannot play audio or read full text). This creates loss aversion and is the highest-converting approach for emotional data. Locked entry card design to be specced during Phase 6 (Subscription & Paywall implementation).
- **Paywall placement:** After the first recording in onboarding (step 8), after the parent has experienced core value. Visible dismiss button — no dark patterns. "Already subscribed? Restore purchase" link at bottom.
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
- Partner/spouse access included in the base subscription — both parents journal on one plan. Directly undercuts competitors who gate partner sharing behind $96+/year premium tiers
- The subscription unlocks everything; the book is an add-on purchase

---

## 6. Family Sharing Roadmap

### Phase 1 — MVP
- Single user (one parent) per account
- One journal with multiple children (tab per child)

### Phase 2 — Parent Merge (Linked Accounts)
- Each parent has their own account with their own login — no shared credentials
- Parents pair accounts via an invitation flow (one sends invite, other accepts)
- Both see a unified feed of shared children and entries
- Each entry stores a `recorded_by` field showing which parent recorded it
- Second parent can add their own voice recording and perspective to an existing memory — creating a dual-perspective entry
- Memory view filtering: toggle between "My memories," "Partner's memories," "Both," or "Others" (grandparents via share links)
- Included in the base subscription — no premium tier upsell
- Partner prompt feature: both parents get the same daily prompt → record independently → paired responses surfaced side by side at week's end

### Phase 3 — Extended Family
- Share a link (one-time or ongoing) for grandparents, aunts, etc.
- Contributors can add entries tagged to specific children
- Owner (parent) approves contributions before they appear in the book
- Potential: read-only sharing for family members who just want to browse
- Seasonal/holiday invites: around major holidays, prompt the parent to send record request links to family with one tap — builds holiday-tagged collections that become annual traditions

---

## 7. Feature Roadmap

> **High-level overview:** See [`feature-roadmap.md`](feature-roadmap.md) for the one-page bird's-eye view of all features across versions. The detailed checklists below are the full spec-level breakdown.

### MVP (Month 1-3) — Core Loop
- [ ] Voice recording with on-device transcription (60-second auto-stop)
- [ ] Text entry (type instead of speak — "or write instead" secondary action)
- [ ] Audio preservation (keep original recordings)
- [ ] Child profiles (name required, birthday required, nickname optional)
- [ ] Child color auto-assignment from palette (Blue, Amber, Green, Plum, Teal, Rose)
- [ ] Age stamp on every entry — auto-calculated from child's birthday (e.g., "Emma 2y 4m")
- [ ] Per-child tab view with entry card layout (Home screen)
- [ ] Single-child variant (warm pill with age + memory count when only one child)
- [ ] Entry Detail view (always-stacked metadata, ×/+ child pills, inline child picker with swap mode, tag row, transcript editor, audio playback, heart toggle, soft delete with 30-day recovery)
- [ ] Auto-detect child from transcript (pre-fills pills on Entry Detail)
- [ ] Core Memories screen (favorites — elevated visual treatment, larger serif cards, inline audio play)
- [ ] Push notification with personalized child name + age prompt
- [ ] Notification actions: Record (→ Recording) and Remind Me Later (30-min snooze)
- [ ] Full-text keyword search with child/tag/date range filters
- [ ] Settings (children management, reminder time, subscription, Recently Deleted, data export, account deletion)
- [ ] Onboarding: Sign In → Add Child (with inline birthday picker) → Mic Permission → Notifications → First Recording → Memory Saved → Paywall → Home (first-entry state)
- [ ] Free trial (7 days) → subscription paywall ($5.99/mo or $49.99/yr)
- [ ] User authentication (Apple + Google + Email) + cloud sync
- [ ] Empty state (warm invitation when all entries deleted)
- [ ] Backdating entries (date picker on in-app capture path; notification path defaults to today)
- [ ] "First memory" badge per child (permanent marker on the first entry)
- [ ] Prompt cards on Recording screen (age-bracketed, shuffled from curated bank)
- [ ] Welcome preview page — new onboarding screen before paywall showing what the app looks like with months of data (full feed, search, Core Memories) so parents see what they're subscribing to
- [ ] Location capture — auto-detect device location as readable text label (e.g., "Tampa, FL") + manual override field. Stored on each entry for future search. No map/GPS complexity — just a text field
- [ ] Schema future-proofing — add `title`, `recorded_by`, and `location_text` fields to entry table during backend setup, even though full features ship later

### V1.5 (Month 4-6) — Retention & Polish
- [ ] **AI-generated titles** — each memory gets an auto-generated title based on transcript content (e.g., "Emma's First Giggle," "Bath Time Chaos"). Displayed on entry cards in the feed, making entries scannable and distinct. Title is editable by parent — AI suggests, parent controls. Generated via the same Claude API call as tagging (see Section 3.3). Essential for parent merge (V2) where titles help reference specific memories. Bake `title` field into schema at V1.0
- [ ] **AI transcript cleanup** — light AI pass on raw transcripts to remove filler words (um, uh, like, you know) and fix obvious speech-to-text errors while preserving the parent's authentic voice and meaning. Runs as part of the same Claude API call as titles and tags. On-device transcription first, then text sent to AI for cleanup — no audio leaves the device. Parent sees the cleaned version but can always revert to the original transcript
- [ ] "On this day" memory resurfacing (1 year ago today) — see Section 4b for card design spec
- [ ] Milestone celebrations — AI detects milestone language, flags with star badge + celebration animation; auto-prompts parent to share via record request link. See Section 4b for badge design spec
- [ ] Age milestone markers in timeline — divider cards at birthday boundaries. See Section 4b
- [ ] Developmental prompts by age (age-appropriate prompt suggestions)
- [ ] Prompt rotation system (pre-generated, curated prompts — expand bank from 20-30 to hundreds)
- [ ] Improved transcription (cloud fallback for low-confidence entries — see Section 2.1.1)
- [ ] "Quiet week" prompt for inactive users — see Section 4b
- [ ] LLM-powered auto-tagging upgrade (Claude Haiku — see Section 3.3)
- [ ] **Add photos (cap 3)** — attach up to 3 photos per entry via camera or gallery picker. Photos display in Entry Detail below the transcript. Keeps the focus on voice/text (the differentiator) while letting parents add visual context. Photos stored in Supabase Storage alongside audio files
- [ ] **Birthday quiz** — on a child's birthday, app sends a special push notification or shows an in-app interstitial with guided questions ("What's their favorite food right now?" "What word do they say funny?" "What are they obsessed with?"). Responses saved as a structured text entry tagged with the child and a "birthday" tag. Creates an annual snapshot tradition. Overlaps with Keepsakes' core workflow, validating demand
- [ ] **Help / menu section** — expandable dropdown or dedicated screen accessible from the top bar. Includes: FAQ, "Ways to Use Your Memories" (4 articles linking to website — e.g., "Share with Grandparents," "Create a Birthday Tradition," "Build a Bedtime Routine," "Make a Keepsake Book"), Contact Us, mission/about, and a deeper dive into family connection. Content links to external website rather than living in-app
- [ ] Share individual entries — tap share to generate a read-only link with entry text, child name, date, and audio playback; shareable via native share sheet
- [ ] In-app feedback — "Contact Us" in Settings opens email compose with device info + app version auto-attached
- [ ] Family recap emails — weekly text digest + monthly audio highlight reel with "voices this month" section (see Section 4)
- [ ] Quick-react mood/emotion tags — after recording, one-tap mood icon (laughing, crying, proud, exhausted, grateful); filterable later
- [ ] Quiet mode / whisper detection — auto gain adjustment for low-volume environments
- [ ] Audio playback on Home entry cards (port inline play from Core Memories to standard cards if validated)

### V2 (Month 6-12) — Growth & Expansion
- [ ] **Parent merge (linked accounts)** — replaces "partner sharing (two parents, one account)." Each parent has their own account with their own login. Parents pair accounts via an invitation flow (one sends invite, other accepts). Both see a unified feed of shared children and entries. Each entry stores a `recorded_by` field showing which parent recorded it. Second parent can add their own recording/perspective to an existing memory — the entry then has two voice recordings and two transcript sections. UI needs to handle dual-perspective entries (either two text blocks within one entry, or a tabbed "Mom's version / Dad's version" view — to be designed). Included in base subscription, no premium tier. Partner must approve invitation (no unilateral access)
- [ ] **Memory view filtering** — new filter axis on Home and Search screens. Toggle between: "My memories," "Partner's memories," "Both," and "Others" (grandparents/family who contributed via share links). Works alongside the existing child tab filter. Depends on parent merge infrastructure being in place
- [ ] **Search scroll (Google Photos style)** — as you scroll the entry feed (Home or Search), a floating date indicator shows your position in time. Fast-scrolling accelerates through months and years with snap points at date boundaries. Uses section list headers that stick as you scroll. Becomes essential once a user has hundreds of entries — a "success problem" worth solving when retention is strong
- [ ] **Start/stop recording** — pause and resume during a 60-second recording. Audio segments stitched together seamlessly. Transcript handles the gap gracefully. Lets parents collect their thoughts mid-recording without wasting time. Recording timer pauses during breaks
- [ ] **Location search + recaps** — search and filter entries by location using simple text matching, not geo-queries (e.g., type "Italy" and find all entries where location contains "Italy"). Location-based recaps (e.g., "Your Tampa trip, Summer 2025" — auto-grouped entries from the same location and time period). Builds on location capture from V1.0
- [ ] "Memory Sparks" — import photo from camera roll, app prompts "What was happening here?"
- [ ] AI semantic search — natural language queries ("When did Liam first talk about wanting a dog?") with synthesized answers linking to original audio; built on pgvector + RAG pattern; grows more powerful with usage
- [ ] Keepsake book builder + print-on-demand integration
- [ ] Extended family sharing via invite links
- [ ] Shared entry management — view all shared entries, revoke links from settings
- [ ] Shared entry web page includes subtle Core-Memories branding + "Capture your family's memories" CTA (organic acquisition loop)
- [ ] Referral program — invite a parent friend, both get a free month; built into Settings
- [ ] Yearly recap — "Year in Memories" email with curated audio, growth stats, month-by-month highlights, year-end letter prompt; timed near renewal (see Section 4)
- [ ] Titled record requests via link — parent sends a named, themed recording link to family; recipient records on simple web page, no app/account needed
- [ ] Family tree / people tagging — set up family members once, tag in entries, filter by person
- [ ] Partner prompt / "question of the day" — both parents get same prompt, record independently, paired at week's end
- [ ] Seasonal & holiday memory prompts with family invites
- [ ] Extended recording option — "Keep Going" button at 60s extends to 3-minute cap (if user feedback warrants it)

### V3+ (Year 2) — Platform
- [ ] "Interview Mode" — guided Q&A to record the child's own answers
- [ ] Collaborative family timeline
- [ ] **Responsive milestones** — as kids hit milestones (detected from dates or memory content), app surfaces age-appropriate recommendations, parenting wisdom, and (opt-in) curated product suggestions via affiliate links. Requires dedicated marketing support to execute without compromising the app's trusted, journal-first identity. Parked for now — revisit when the app has scale and marketing capacity
- [ ] Foster care adaptation (structured documentation, agency partnerships)
- [ ] Export options (PDF, full data export)
- [ ] Offline recording with background sync

---

## 8. Data & Privacy

> **Detailed schema:** See [`database-schema.md`](database-schema.md) for complete table definitions, column specs, indexes, RLS policies, and migration sequence.

### Principles
- User data is never sold, mined, or used for advertising
- Entries are encrypted at rest and in transit
- Cloud sync is required (entries must survive app deletion/reinstall)
- COPPA considerations: the app stores data *about* children but is used *by* parents — legal review needed for compliance posture
- All entries are treated equally — no special "sensitive" flagging (parent decides what to record)

### Data Architecture
- User account with auth (Apple Sign-In, Google Sign-In, or email)
- Child profiles linked to user account (name required, birthday required, nickname optional, color auto-assigned)
- Entries linked to child profiles + user account (one or more children per entry; zero-child state blocked by picker logic)
- Audio files stored in cloud object storage (Supabase Storage, S3-compatible)
- Transcripts stored in searchable database (PostgreSQL)
- Tags as structured metadata on entries with `source` field (system, ai-generated, user-created)
- Soft-deleted entries held for 30 days before permanent purge

### Data Portability
- Full data export (text + audio + metadata) available at any time, even after canceling subscription
- No paywall hostage dynamics — your memories remain accessible regardless of subscription status
- Data ownership is a core promise and should be prominently communicated in marketing and onboarding

---

## 9. Non-Functional Requirements

These are the performance, security, and quality targets that apply at MVP. More detailed NFRs can be added as the product scales.

### Performance
- **NFR-001:** App cold start to home screen in ≤2 seconds on devices from 2020 or newer
- **NFR-002:** Voice transcription completes within 5 seconds for entries ≤60 seconds
- **NFR-003:** Search results return within 1 second for libraries of up to 5,000 entries
- **NFR-004:** Time from install to first saved entry ≤90 seconds (onboarding speed target)

### Security & Privacy
- **NFR-005:** All data in transit encrypted via TLS 1.3. All data at rest encrypted (AES-256 or equivalent)
- **NFR-006:** Audio files and entry text stored in user-isolated data partitions. No user's data is accessible to another user except via explicit sharing (V1.5+)
- **NFR-007:** COPPA — the app stores data *about* children but the parent is the account holder and data subject. Legal review required to confirm this interpretation before launch

### Accessibility
- **NFR-008:** All interactive elements have accessible labels (e.g., "Record a new memory", not just an icon)
- **NFR-009:** Minimum touch targets: 44x44pt (iOS) / 48x48dp (Android). Note: child picker + button is currently 24×24px in wireframe — pad tappable area for implementation.
- **NFR-010:** Voice recording includes visual feedback (breathing circle + timer) for users who cannot hear audio playback
- **NFR-011:** Support for Dynamic Type (iOS) and font scaling (Android)
- **NFR-012:** Color contrast ratio ≥4.5:1 for all text. Note: verify textMuted (#B5AAA0) against bg (#FAF8F5) meets this threshold.
- **NFR-013:** Respect device-level Reduce Motion setting (`prefers-reduced-motion`). When enabled, disable decorative animations (pulseGlow, breathe, fadeInUp stagger) while preserving functional transitions (screen navigation, modal enter/exit). Hook already implemented in `hooks/useReduceMotion.ts`.

---

## 10. Technical Stack (Confirmed)

### Platform
- **iOS + Android simultaneous launch.** Expo and React Native provide a single codebase for both platforms. Target demographic (moms of toddlers) skews iPhone, but Android users represent a significant audience worth capturing from day one.

### Frontend
- **React Native + Expo (TypeScript)** — single codebase, familiar to React web devs, Expo handles builds/OTA updates/app store submission via EAS
- **UI:** React Native StyleSheet with centralized design tokens (`constants/theme.ts`). All colors, typography, spacing, radii, and shadows imported from theme — no hardcoded values in components
- **State management:** Zustand — lightweight, minimal boilerplate, scales better than Context for multiple state domains (auth, entries, children, UI). MVP auth store tracks onboarding completion only; full auth state (user identity, tokens) added during Phase 4a Supabase integration
- **Animations:** React Native built-in Animated API for Expo Go compatibility during static prototype phase. Migrate to React Native Reanimated when custom dev client is introduced in Phase 4 (required for speech recognition). Reanimated also supports web via CSS transitions
- **Speech-to-text:** `expo-speech-recognition` (by jamsch) — target library for Phase 4c. Wraps Apple SFSpeechRecognizer (iOS) and Google SpeechRecognizer (Android), real-time streaming transcription, zero cost, proper Expo config plugin, built-in audio file persistence (`recordingOptions.persist`). Not yet integrated — current prototype uses mock transcription data

### Backend
- **Supabase (direct client SDK)** — PostgreSQL + Auth + Storage + Row Level Security. App talks to Supabase directly; Edge Functions handle server-side logic (tagging pipeline, background processing). No custom API layer for MVP.
- **Auth:** Apple Sign-In + Google Sign-In + email/password (Apple is required for iOS apps offering social login)
- **Audio storage:** Supabase Storage (S3-compatible). Pro plan ($25/mo) includes 100GB — sufficient for 1,000+ users at compressed audio sizes.
- **Audio format:** AAC (.m4a) — native iOS support, ~100KB per 60-second entry, ~300KB per 3-minute entry. Best balance of quality, file size, and compatibility. At 1,000 users × 5 entries/week (assuming average 60s entries), that's ~2GB/month new storage. Note: `expo-speech-recognition` persists audio as WAV/PCM (larger). For MVP, upload WAV directly (~5MB/min); optimize to .m4a transcoding when storage costs become meaningful (post-1,000 users).

### Notifications
- **Local scheduled notifications** via Expo Notifications for MVP. Set once on device at user's chosen time, fires daily. Prompt text drawn from a static pool bundled in the app, personalized with child name and age at runtime. Upgrade to server-sent push for dynamic content in V1.5+.

### Payments
- **RevenueCat** — wraps Apple/Google in-app purchases with unified API. Handles receipt validation, trial management, subscription lifecycle, and basic analytics. Free tier covers up to $2,500/mo in MTR.

### Analytics
- **PostHog** — open source, generous free tier (1M events/mo), privacy-friendly. Good alignment with the app's privacy-first positioning. Tracks retention, funnel analysis, and custom events.

### AI Tagging (MVP → V2)
- **MVP:** Keyword matching for topic classification — implemented during Phase 4d (Saving Entries). Current prototype uses manual tagging only
- **V1.5:** Anthropic Claude API (Haiku) for LLM-based classification, AI-generated titles, and AI transcript cleanup (see Section 3.3). Single API call handles all three tasks
- **V2:** AI semantic search via pgvector + RAG (see Semantic Search below)

### Cloud Transcription (V2)
- **Target provider:** Deepgram Nova-2 — $0.0043/min, $200 free credit (see Section 2.1.1 for detailed evaluation)
- Fallback for entries where on-device transcription has low confidence
- Not needed at MVP — on-device speech recognition is sufficient for most use cases

### Semantic Search (V2)
- **pgvector** extension in Supabase PostgreSQL for vector embedding storage
- **RAG pattern:** embed transcriptions on save → similarity search on query → synthesize answer with links to source entries
- Gets more powerful the longer someone uses the app as the embedding library grows

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

### 10.1 Architectural Decisions (Bake In During Development)

Zero-effort decisions during development that prevent expensive rework at scale. These cost nothing extra to implement now but save significant refactoring later.

1. **Separate dev/prod Supabase projects from day one** — create `core-memories-dev` and `core-memories-prod`. Never test against production data.
2. **Use environment variables for all service URLs/keys** — never hardcode Supabase URL, PostHog key, RevenueCat API key, etc. Use Expo's `.env` support.
3. **Abstract storage calls behind a service layer** — if you ever move from Supabase Storage to raw S3, you change one file, not fifty.
4. **Add database indexes on frequently queried columns** — `user_id`, `child_id`, `created_at`, full-text search column, and compound index on `(user_id, created_at)` for timeline queries.
5. **Use Supabase Row Level Security (RLS) from the start** — trivial to set up during table creation, painful to retrofit. Every table should have RLS policies before the first row is inserted.
6. **Version database schema with migrations** — use Supabase CLI migrations. Don't make schema changes by clicking in the dashboard.
7. **Log PostHog analytics events as you build each feature** — don't plan an "add analytics" sprint later. Drop the event call in as you write the feature code.

---

## 11. Competitive Positioning

> **Full analysis:** See [`Competitive Landscape`](../research/competitors.md) for detailed head-to-head comparisons across baby journal apps, voice-first journaling apps, and general journaling tools.

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
- Time to first entry (target: < 90 seconds from install)
- Audio vs. text entry ratio (validates voice-first thesis)
- Search usage (validates that users come back to browse)
- Core Memories usage (validates that parents curate favorites)
- Notification tap-through rate (validates personalized prompts)
- 60-second cap hit rate (informs whether to add "Keep Going" extension)

---

## 14. Open Questions

- [ ] **Name:** "Core-Memories" is a working title — explore alternatives
- [ ] **Free trial length:** 7 vs. 14 days — A/B test once live
- [ ] **COPPA compliance:** Legal review needed for storing data about children
- [ ] **Audio storage costs:** Model the per-user storage cost at scale (1 entry/day x 60 seconds x 1,000 users)
- [x] **Platform:** ~~Launch iOS-only or iOS + Android simultaneously?~~ **Decided: iOS + Android simultaneously via Expo.**
- [ ] **Age display granularity:** Should age auto-adjust format based on child's age (days for 0–3 months, weeks for 3–12 months, months for 1–3 years, years+months for 3+)?
- [ ] **Recording extension:** Should a "Keep Going" button at 60s extend to 3 minutes? Defer until user data shows how often entries hit the 60-second cap.
- [ ] **Child deletion behavior:** When a child is deleted from Settings, what happens to their entries?

---

## 15. Risks to Review

Key risks from the standard PRD worth revisiting before launch. Not fully specced yet — flagged for future review.

| Risk | Severity | Likelihood | Potential Mitigation |
|------|----------|------------|---------------------|
| Users don't sustain journaling habit past week 1 | High | High | Prompts reduce blank-page friction; personalized notifications; wrap-ups reward sustained use; no guilt mechanisms |
| Voice transcription quality is poor (accents, background noise) | Medium | Medium | Allow text editing of all transcriptions; save original audio as fallback; evaluate cloud STT for V2 |
| COPPA / child privacy compliance issues | High | Medium | Legal review before launch; parent is data subject (not child); no child-identifiable data sent to LLM |
| Subscription fatigue — users won't pay $5.99/mo | High | Medium | Paywall after first recording creates emotional investment; pricing competitive; A/B test $4.99 and $6.99 |
| Third-party API dependency (Deepgram, Claude) | Medium | Low | Abstract transcription and tagging behind service interfaces; can swap providers without app changes |
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
| Developmental prompts | Age-specific prompt suggestions | High | Selected as V1.5 feature |
| Gratitude/reflection mode | Weekly prompt for grateful parenting moments | Low | Nice but not core |
| Sibling comparison | Side-by-side view of Child A at age 3 vs. Child B at age 3 | Low | Fun but niche |
| Letter to future child | Special recording mode — parent speaks directly to their child for them to hear someday; distinct UI | Medium | Strong marketing content; distinct from Time Capsule |
| Text-based printed journal | Clean paperback diary: dated transcriptions, age stamps, optional photos, QR codes linking to original audio | Medium | Design data model to support now; implement V2+. Complements keepsake book |
| Audio playback on Home cards | Port inline play from Core Memories to standard entry cards on Home | Medium | Validate on Core Memories first; add to Home in V1.5 if engagement is high |
| Merge two memories (drag & drop) | Combine two separate entries into one by dragging one onto the other | Low | Parked — UX is unclear (what happens to two audio files, two transcripts, different child tags?). Rare edge case. Simpler workaround: copy-paste text between entries and delete the duplicate |