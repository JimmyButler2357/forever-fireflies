# Core Memories — Feature Roadmap

High-level view of what we're building and when. For detailed feature specs, see [Product Spec](product-spec.md). For build execution, see [Project Plan](project-plan.md).

Last updated: February 2026

---

## V1.0 — Launch

Everything needed to ship a working app to the App Store. The core journaling experience.

| Feature | Description |
|---------|-------------|
| Voice recording + transcription | 60-second voice memos with on-device speech-to-text |
| Text entry | "Or write instead" alternative to voice |
| Per-child organization | Entries tagged to children, filterable by child tabs |
| Auto-detect child from transcript | App pre-fills child pills from names/nicknames in the transcript |
| Auto-tagging (keyword) | Topic tags (milestone, humor, first, bedtime, etc.) via keyword matching |
| Full-text search + filters | Search by keyword, child, tag, and date range |
| Core Memories (favorites) | Favorited entries with elevated visual treatment and inline audio playback |
| Notifications + prompts | Personalized daily push with child name + age, configurable time |
| Prompt cards | Age-bracketed recording prompts shuffled on the Recording screen |
| Subscription + paywall | 7-day free trial, $5.99/mo or $49.99/yr via RevenueCat |
| Onboarding (8 screens) | Sign In → Add Child → Permissions → First Recording → Paywall → Home |
| **Welcome preview page** | New screen before paywall showing what the app looks like with months of data — gives parents a reason to subscribe |
| **Backdating / date selector** | Date defaults to today but is adjustable via scroll picker (reuse birthday picker component) |
| **Location capture** | Auto-detect device location as text label (e.g., "Tampa, FL") + manual override. Stored on entries for future search |
| Settings | Children management, reminder time, subscription, Recently Deleted, about/legal |
| Empty + loading + error states | Every screen handles all three states — no blank screens |

**Bold** = new ideas from Feb 2026 brainstorm session.

---

## V1.5 — Retention & Polish (Month 4-6 post-launch)

Make the app smarter, more useful, and harder to leave. Focus on AI features and content depth.

| Feature | Description |
|---------|-------------|
| **AI-generated titles** | Each memory gets an auto-generated title from its transcript (e.g., "Emma's First Giggle"). Editable by parent. Makes the feed scannable and each card distinct |
| **AI transcript cleanup** | Light AI pass removes filler words (um, uh) while preserving the parent's authentic voice. Same API call as titles/tags |
| LLM-powered auto-tagging | Upgrade from keyword matching to Claude Haiku for smarter topic classification + custom tag suggestions |
| "On this day" resurfacing | Memory from 1 year ago surfaces at the top of the feed with special card treatment |
| Milestone celebrations | AI detects milestone language, flags with star badge + celebration animation |
| Age milestone markers | Divider cards at birthday boundaries in the timeline |
| Developmental prompts | Age-appropriate prompt suggestions that evolve as children grow |
| **Add photos (cap 3)** | Attach up to 3 photos per entry. Camera or gallery picker. Keeps focus on voice/text while adding visual context |
| **Birthday quiz** | On a child's birthday, app sends special notification with guided questions (favorite food, funny words, current obsessions). Saves as a structured text entry — annual snapshot |
| **Help / menu section** | Expandable menu with FAQ, "Ways to Use Your Memories" articles (link to website), Contact Us, mission/about |
| Share individual entries | Generate read-only link with entry text, date, and audio playback via native share sheet |
| Family recap emails | Weekly text digest + monthly audio highlight reel |
| In-app feedback | Contact Us in Settings opens email compose with device info auto-attached |
| Cloud transcription fallback | For entries where on-device transcription has low confidence, offer cloud upgrade |
| Quiet week prompt | Gentle re-engagement for users inactive 7+ days |
| Quick-react mood tags | One-tap mood icon after recording (laughing, crying, proud, exhausted); filterable later |
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
| **Start/stop recording** | Pause and resume during a recording. Audio segments stitched together. Lets parents collect their thoughts mid-recording |
| **Location search** | Search and filter entries by location — simple text matching, not geo-queries (e.g., search "Italy" to find all vacation memories). Location-based recaps (e.g., "Your Tampa trip, 2025") |
| AI semantic search | Natural language queries ("When did Liam first talk about wanting a dog?") via pgvector + RAG pattern |
| Partner prompt / question of the day | Both parents get the same daily prompt, record independently, paired responses surfaced side-by-side at week's end |
| Memory Sparks | Import photo from camera roll, app prompts "What was happening here?" — bridges photos and voice |
| Extended family sharing | Invite links for grandparents/family to contribute recordings. No app or account needed |
| Keepsake book builder | Print-on-demand physical books compiled from entries with auto-generated yearly suggestion |
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

## Schema Fields to Bake In at V1.0

These fields should be added to the database schema during Phase 3 (Supabase Backend) even though their full features ship later. Costs nothing now, prevents expensive rework later.

| Field | On Table | Used By | Ships In |
|-------|----------|---------|----------|
| `title` | entries | AI-generated titles | V1.5 |
| `recorded_by` | entries | Parent merge / linked accounts | V2 |
| `location_text` | entries | Location capture + search | V1.0 (capture), V2 (search) |

---

*This roadmap is a living document. Features may shift between versions based on user feedback, technical feasibility, and business priorities.*
