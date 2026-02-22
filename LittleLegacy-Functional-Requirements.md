# LittleLegacy — Functional Requirements & Acceptance Criteria

Companion document to the Product Spec. This covers implementation-level requirements for MVP and acceptance criteria that define "done" for each feature.

Requirements are grouped by feature area. Each links back to a product goal:
- **G-1** Habit Formation (users recording regularly)
- **G-2** Tagging Accuracy (auto-tags are useful)
- **G-3** Search Utility (parents can find memories)
- **G-4** Subscription Conversion (trial → paid)

---

## 1. Account & Onboarding

**FR-001 [G-1]:** Given a new user opening the app for the first time, the system enables account creation via email/password or social auth (Apple, Google). The user reaches the ability to record their first entry within 90 seconds of opening the app.
- *Edge cases:* Invalid email → inline error. Duplicate account → prompt to sign in. Network failure → clear error with retry.

**FR-002 [G-1]:** Given a new user with no children added, the system prompts the user to create at least one child profile before their first entry. Profile fields: name (required), nickname (optional — also used for transcript auto-detection, e.g., "Bug"), birthday (optional), gender/pronouns (optional — enables gendered prompts), photo (optional). Supports adding 1–20 children.
- *Edge cases:* Duplicate child names → allowed (distinguished by photo or nickname). Empty name → blocked with inline validation. Nickname matches another child's name → flag but allow.

**FR-003 [G-1]:** Given a user completing child profile setup, the system prompts the user to set a preferred nightly notification time (default: 8:30 PM local time). The user can skip and set later in settings.

---

## 2. Voice Entry & Transcription

**FR-004 [G-1]:** Given an authenticated user on the home screen, the system provides a prominent record button. Tapping it begins voice capture with a visible waveform and elapsed time. Recording supports entries from 1 second to 10 minutes.
- *Edge cases:* Microphone permission denied → prompt to enable in system settings. Background noise → transcription proceeds with best effort. Accidental tap → discard with confirmation if recording is <3 seconds.

**FR-005 [G-1, G-2]:** Given a completed voice recording, the system transcribes the audio to text using on-device speech APIs and displays the transcription within 5 seconds for entries under 60 seconds. The transcription is editable as plain text.
- *Edge cases:* Empty/silent audio → prompt to re-record. Transcription failure → retry once automatically, then show error with option to save audio-only entry.

**FR-006 [G-1]:** Given a transcribed or typed entry, the system stores both the text content and the original audio file (if voice-recorded). Audio is retrievable from the entry detail view for playback at any time.

---

## 3. Text Entry & Editing

**FR-007 [G-1]:** Given an authenticated user, the system provides a text entry mode accessible from the home screen alongside the voice record button. Text entry supports free-form input with no character limit.
- *Edge cases:* Empty submission → blocked with inline prompt ("Write something about your kid's day").

**FR-008 [G-1]:** Given any saved entry (voice-transcribed or text), the user can edit the text content, change child tags, and modify topic tags at any time. Edits are saved immediately (autosave). The original transcription is preserved (not overwritten).

---

## 4. Child Tagging

**FR-009 [G-1, G-3]:** Given a new entry (voice or text), the system auto-detects child names AND nicknames from the transcript and pre-selects the matching child profile(s). If no child is detected or detection is ambiguous, the system defaults to the most recently viewed child. The user can adjust child tags before or after saving.
- *Edge cases:* No children exist → redirect to create child flow. Entry about the family generally → allow saving with no specific child tag (filed under "Family"). Multiple children mentioned → tag to all detected children. Nickname matches → resolve to the child profile that owns that nickname.

**FR-010 [G-3]:** Given a saved entry tagged to a child, the entry appears in that child's tab/book view and is indexed for search by child name.

---

## 4b. Entry Date

**FR-009b [G-1]:** Given the in-app capture flow (Path B), the entry date defaults to today. A "change date" option allows the user to select a past date via a date picker for recording older memories. The notification capture flow (Path A) always defaults to today with no date picker shown.
- *Edge cases:* Future dates → blocked. Dates before the child's birthday → allowed (pregnancy memories, etc.).

---

## 5. Auto-Tagging

**FR-011 [G-2]:** Given a saved entry with text content, the system applies topic tags from a predefined taxonomy: humor, milestone, first, sports, school, health, birthday, holiday, family, friendship, creativity, nature, food, bedtime, travel, sweet moment, other. MVP uses keyword matching and lightweight NLP; V2 upgrades to LLM-based classification (see Product Spec Section 3.3).
- *Edge cases:* Tagging service fails → save entry without tags, do not block the save flow. Ambiguous content → apply up to 3 most-confident tags.

**FR-012 [G-2]:** Given auto-applied topic tags, the user can view, remove, or add tags manually on any entry via the entry detail view. One-tap interaction — not a form.

---

## 6. Nightly Notification

**FR-013 [G-1]:** Given a user with notifications enabled and a preferred time set, the system delivers a push notification at the configured time. The notification includes a rotating prompt snippet (e.g., "What was the best part of [child name]'s day?"). Tapping the notification opens the app directly to the recording screen.
- *Edge cases:* Notification permissions denied → in-app banner explaining value and linking to system settings. Timezone changes → re-schedule to new local time.

**FR-014 [G-1]:** Given notification settings, the user can configure: time of day and which days of the week (default: every day). Accessible from Settings. If notifications are ignored for 5+ consecutive days, the system reduces frequency rather than increasing pressure.

---

## 7. Search & Browse

**FR-015 [G-3]:** Given entries in the system, the user can browse a per-child tab view showing entries in a chat-row layout (date, first line of transcript, topic tag). Entries are ordered newest-first. Tap to expand shows full detail.

**FR-016 [G-3]:** Given the search interface, the user can search by free-text keyword across all transcripts. Search supports optional filters: by child, by topic tag, by date range. Results show entry previews with matching terms highlighted.
- *Edge cases:* No results → friendly empty state with suggestion to broaden search. Special characters → sanitized.

**FR-017 [G-3]:** Given search results, the user can tap any entry to view the full detail: text, audio playback (if voice entry), all tags, timestamp.

---

## 8. Entry Detail View

**FR-018 [G-1, G-3]:** Given the entry detail view, the screen displays: full editable transcript, play audio button (if voice entry), child tag(s) with option to change, topic tags with option to add/remove, date and time recorded, and optional favorite/highlight toggle.

---

## 9. Subscription & Trial

**FR-019 [G-4]:** Given a new user, the system offers a free trial (7–14 days, length TBD) with full feature access. After trial expiration, existing entries become visible but locked — the user can see dates, child names, and the first few words, but cannot play audio or read full transcript text until subscribing.
- *Edge cases:* Trial expiration mid-entry → allow completing and saving the current entry, then apply paywall. Payment failure → 3-day grace period with in-app banner.

**FR-020 [G-4]:** Given subscription management, the system integrates with Apple App Store and Google Play Store billing via RevenueCat. The user can view subscription status, switch plans, and cancel from Settings. Cancellation retains access through the current billing period.

---

## 10. Guided Prompts (Basic — MVP)

**FR-021 [G-1]:** Given the in-app capture flow (Path B), the system displays 2–3 prompt suggestions on the recording screen (e.g., "What made you laugh today?", "What's something new [child name] did?"). Prompts are drawn from a static pool of 20+ prompts and rotate daily.
- *Note:* Full prompt rotation system with 50+ prompts, refresh button, and developmental age-based prompts is V1.5.

**FR-022 [G-1]:** Tapping a prompt opens the recording/text entry screen with the prompt displayed as context above the input area. The prompt text is NOT pre-filled into the entry text — it's visual context only.

---

## Acceptance Criteria (MVP)

### AC-1: Nightly Voice Entry (Full Flow)
**Given** a subscribed user with notifications enabled and 2 children (Emma, Liam)
**When** the nightly notification fires and the user taps it, records a 20-second voice entry
**Then** the entry is transcribed within 5 seconds, the app auto-detects "Emma" from the transcript and pre-selects her, topic tags are applied, and the entry is visible in Emma's tab and searchable by keyword

### AC-2: Text Entry with Manual Tags
**Given** a subscribed user on the home screen
**When** the user taps the text entry button, types a 3-sentence entry, selects "Liam" as the child, and saves
**Then** the entry is saved with auto-applied topic tags, the user can add or remove tags from the detail view, and the entry appears in Liam's tab

### AC-3: Onboarding to First Entry
**Given** a brand new user who has never opened the app
**When** the user creates an account, adds a child profile ("Emma", age 3), and records their first voice entry
**Then** the total time from app open to saved first entry is under 90 seconds; the entry appears in Emma's tab; the user is prompted to set notification time

### AC-4: Trial Expiration & Paywall
**Given** a user whose 14-day free trial has expired with 30 saved entries
**When** the user opens the app
**Then** all 30 entries are visible in the timeline (dates, child names, first few words shown), but tapping any entry shows a subscription prompt instead of the full detail view; the record button shows a subscription prompt instead of starting a new entry

### AC-5: Search Across Children
**Given** a user with 50+ entries across 2 children, several containing the word "soccer"
**When** the user searches "soccer" with no child filter
**Then** all entries containing "soccer" across both children are returned, sorted by date (newest first), with "soccer" highlighted in the preview text

### AC-6: Prompted Voice Entry
**Given** the home screen displays 3 prompt bubbles including "What made you laugh today?"
**When** the user taps that prompt and records a voice entry
**Then** the recording screen shows the prompt as context above the input, the saved entry does NOT contain the prompt text in its transcript, and the entry is saved and tagged normally

---

## V1.5+ Functional Requirements (Deferred)

These requirements apply to post-MVP features. Included here for completeness — they'll be fully specced when their phase begins.

### In-App Feedback (V1.5)
- **FR-V1.5-001 [G-1]:** Given an authenticated user in Settings, the system provides a "Contact Us / Send Feedback" option that opens a pre-populated email compose with: recipient (support email), subject line including app version and OS version, and body pre-filled with device model and OS info. User adds their message and sends via native mail client.
- *Edge cases:* No mail client configured → show support email address with a "copy to clipboard" option. Mail compose cancelled → no action taken.

### Entry Sharing (V1.5)
- **FR-V2-001:** User can tap a share button on any entry detail view to generate a unique shareable URL. The URL opens a read-only web page displaying: entry text, child first name, date, topic tags, and audio playback button (if voice entry). No account or app download required to view.
- **FR-V2-002:** User can view all shared entries and revoke any shared link from Settings. Revoking makes the URL immediately inaccessible.
- **FR-V2-003:** The shared entry web page includes LittleLegacy branding and a subtle CTA linking to the app store. No tracking cookies or account walls.

### Family Sharing Links (V2)
- **FR-V2-004:** Parent can generate a contributor link (URL) scoped to a specific child or open to any child. The recipient can record a voice memory via a mobile-friendly web page without creating an account.
- **FR-V2-005:** Parent can configure link settings: active/inactive, expiration (never, 24h, 7d, 30d), and label (e.g., "Grandma Sarah"). All active links are viewable and revocable from Settings.
- **FR-V2-006:** Entries submitted via contributor link are saved with contributor label, timestamp, and child tag. They appear in the parent's timeline with a "Contributed by [label]" badge. Auto-tagging runs as normal.

### Monthly / Yearly Wrap-Ups (V1.5)
- **FR-V2-007:** At the end of each calendar month, the system generates a wrap-up viewable in-app: total entries that month, entries per child, most-used tags, and a highlight reel of 3–5 entries selected by recency and tag diversity.
- **FR-V2-008:** At the end of each calendar year, a yearly wrap-up includes: total entries, month-by-month activity chart, top tags, and a curated "best of" selection (5–10 entries). The yearly wrap-up is shareable as an image or link.
