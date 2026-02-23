# Page Wireframes — Core Memories

Simple text outlines of every screen. What's on each page, where it sits, what it does.

---

## 1. Home Screen

```
┌─────────────────────────────────┐
│ TOP BAR                         │
│  Logo/App Name    [Search] [⚙]  │
├─────────────────────────────────┤
│ CORE MEMORIES BUTTON            │
│  [♥ Core Memories]              │
│  → goes to favorites screen     │
├─────────────────────────────────┤
│ CHILD TABS                      │
│  [All] [Emma] [Liam] [...]      │
│  horizontal scroll, tap=filter  │
├─────────────────────────────────┤
│ ENTRY CARDS (scrollable list)   │
│                                 │
│  ┌─ Card ─────────────────────┐ │
│  │ Feb 18, 2026               │ │
│  │ [Emma] [Liam]  ← pills    │ │
│  │ "She said her first full..." │
│  │ [milestone] [funny] ← tags │ │
│  └────────────────────────────┘ │
│                                 │
│  ┌─ Card ─────────────────────┐ │
│  │ Feb 17, 2026               │ │
│  │ [Emma]                     │ │
│  │ "Refused to wear shoes..." │ │
│  │ [funny]                    │ │
│  └────────────────────────────┘ │
│                                 │
│  (reverse chronological)        │
│                                 │
├─────────────────────────────────┤
│ BOTTOM ACTION AREA              │
│                                 │
│         [✏]  [  🎙  ]          │
│        text    RECORD           │
│       (small)  (BIG)            │
│                                 │
│  Record = open Recording Screen │
│  Pencil = open blank Entry      │
└─────────────────────────────────┘
```

**Functions:**
- Search icon → Search Screen
- Gear icon → Settings Screen
- Core Memories button → Core Memories Screen
- Child tabs → filter entry cards by child ("All" = everything)
- Tap entry card → Entry Detail Screen
- Record button → Recording Screen
- Pencil button → blank Entry Detail (text-only, no audio)

---

## 2. Push Notification (Nightly Prompt)

```
┌─────────────────────────────────┐
│ CORE MEMORIES                   │
│ "What made you smile today?"    │
│                                 │
│ [Record]  [Open App]  [Later]   │
└─────────────────────────────────┘
```

**Functions:**
- Fires at user-set reminder time each evening
- Prompt text rotates nightly (warm, never guilt-inducing)
- "Record" → launches straight to Recording Screen
- "Open App" → launches to Home Screen
- "Remind Me Later" → snoozes 30 minutes
- Tap notification body (no action) → Home Screen
- If ignored for days, frequency reduces (never increases)

---

## 3. Recording Screen

```
┌─────────────────────────────────┐
│ TOP BAR                         │
│  [X Cancel]                     │
├─────────────────────────────────┤
│ PROMPT CARDS                    │
│                                 │
│  ┌────────────────────────────┐ │
│  │ Any new words or phrases?  │ │
│  └────────────────────────────┘ │
│  ┌────────────────────────────┐ │
│  │ What made them laugh?      │ │
│  └────────────────────────────┘ │
│  ┌────────────────────────────┐ │
│  │ Did they try something new?│ │
│  └────────────────────────────┘ │
│                                 │
│  (age-specific, shuffled daily) │
│  (fade out once recording       │
│   starts)                       │
│                                 │
├─────────────────────────────────┤
│ RECORDING AREA                  │
│                                 │
│  BEFORE:                        │
│         [  🎙  ]                │
│       tap to start              │
│                                 │
│  DURING:                        │
│      ∿∿∿ waveform ∿∿∿          │
│         [  ⏹  ]                │
│          0:34                   │
│    (auto-stops at 1:00)         │
│                                 │
├─────────────────────────────────┤
│ AFTER RECORDING — CHILD SELECT  │
│ (bottom sheet / overlay)        │
│                                 │
│  Who is this about?             │
│  [Emma] [Liam] [All/General]   │
│  (tap one or more)              │
│                                 │
│  → transitions to Entry Detail  │
│    with transcript + children   │
│    assigned                     │
└─────────────────────────────────┘
```

**Functions:**
- Cancel/X → discard recording, go back
- Prompt cards → read-only inspiration (age-bracketed, 20-30 in bank)
- Record button → start recording, transforms to stop button
- Timer counts up, auto-stops at 60 seconds (MVP)
- After stop → child selection overlay appears
- Select child(ren) → go to Entry Detail with transcript populated
- "All/General" → auto-detection tries to identify child from transcript

---

## 4. Entry Detail / Editor Screen

```
┌─────────────────────────────────┐
│ TOP BAR                         │
│  [← Back]          [☆ Fav] [🗑]│
├─────────────────────────────────┤
│ METADATA HEADER                 │
│  Tuesday, February 18, 2026    │
│  8:47 PM                        │
│  [Emma ✕] [Liam ✕]  ← tappable │
│  Emma: 2 years, 4 months       │
│  Liam: 4 years, 1 month        │
├─────────────────────────────────┤
│ TAGS ROW                        │
│  [milestone ✕] [funny ✕] [+]   │
│  auto-generated, removable,     │
│  can add custom                 │
├─────────────────────────────────┤
│ [✨ Regenerate transcription]   │
│  (sends audio to cloud API for  │
│   better accuracy. 1x per entry,│
│   ~5/week cap)                  │
├─────────────────────────────────┤
│ TRANSCRIPT TEXT AREA            │
│                                 │
│  "She looked at me and said     │
│   'I love you to the moon and   │
│   the stars and the dinosaurs'  │
│   and I just about lost it.     │
│   She's been combining phrases  │
│   like this all week..."        │
│                                 │
│  (editable, auto-saves)         │
│  (subtle "Saved" indicator)     │
│                                 │
├─────────────────────────────────┤
│ AUDIO PLAYBACK BAR              │
│  [▶ Play]  ━━━●━━━━━━  0:34    │
│  (hidden for text-only entries) │
└─────────────────────────────────┘
```

**Functions:**
- Back arrow → return to previous screen
- Star toggle → mark/unmark as Core Memory (favorite)
- Delete → confirmation dialog → soft delete (30-day recovery)
- Child pills → tappable to open picker, add/remove/change children
- Tags → auto-generated, removable via X, add custom via +
- Regenerate → cloud re-transcription (1 per entry, 5/week cap)
- Transcript → fully editable text, all changes auto-save
- Audio bar → play/pause/scrub original recording
- Same screen used for new entries and existing entries

---

## 5. Search Screen

```
┌─────────────────────────────────┐
│ SEARCH BAR                      │
│  [🔍 Search memories...      ]  │
│  (auto-focuses keyboard)        │
├─────────────────────────────────┤
│ FILTER CHIPS (horizontal scroll)│
│  [Child ▾] [Date range ▾]      │
│  [milestone] [funny] [first]... │
│  (combine with search text)     │
├─────────────────────────────────┤
│ RESULTS                         │
│                                 │
│  ┌─ Card ─────────────────────┐ │
│  │ Jan 5, 2026                │ │
│  │ [Emma]                     │ │
│  │ "...her **first steps**    │ │
│  │  across the living room..."│ │
│  │ [milestone] [first]        │ │
│  └────────────────────────────┘ │
│                                 │
│  (same card format as Home,     │
│   matching text highlighted)    │
│                                 │
│  EMPTY STATE:                   │
│  "No memories found. Try        │
│   different keywords or         │
│   filters."                     │
└─────────────────────────────────┘
```

**Functions:**
- Search bar → full-text search across all transcripts
- Filter chips → child (multi-select), date range, tags
- Filters combine with search text
- Results → same card format as Home, search terms highlighted
- Tap card → Entry Detail Screen

---

## 6. Core Memories Screen (Favorites)

```
┌─────────────────────────────────┐
│ TOP BAR                         │
│  [← Back]    Core Memories      │
├─────────────────────────────────┤
│ CHILD TABS                      │
│  [All] [Emma] [Liam] [...]      │
│  (same as Home Screen)          │
├─────────────────────────────────┤
│ FAVORITED ENTRY CARDS           │
│                                 │
│  (same card format as Home,     │
│   only starred entries,         │
│   reverse chronological)        │
│                                 │
│  EMPTY STATE:                   │
│  "Tap the star on any entry     │
│   to save it as a Core Memory." │
└─────────────────────────────────┘
```

**Functions:**
- Back → Home Screen
- Child tabs → filter favorites by child
- Tap card → Entry Detail Screen
- Mirrors Home Screen structure, only shows starred entries

---

## 7. Settings Screen

```
┌─────────────────────────────────┐
│ TOP BAR                         │
│  [← Back]       Settings        │
├─────────────────────────────────┤
│ CHILDREN                        │
│  Emma — birthday: Jun 12, 2023  │
│  Liam — birthday: Oct 3, 2021   │
│  (tap to edit name/birthday)    │
│  (swipe to delete + confirmation│
│   about what happens to entries)│
│  [+ Add Child]                  │
├─────────────────────────────────┤
│ REMINDER                        │
│  Time: [8:30 PM ▾]             │
│  Enabled: [ON/OFF toggle]       │
├─────────────────────────────────┤
│ SUBSCRIPTION                    │
│  Current plan: Premium Monthly  │
│  [Manage / Upgrade]             │
├─────────────────────────────────┤
│ DATA & PRIVACY                  │
│  [Export all entries]            │
│  [Recently Deleted]             │
│  [Delete account]               │
├─────────────────────────────────┤
│ ABOUT                           │
│  Version 1.0.0                  │
│  [Privacy Policy]               │
│  [Terms of Service]             │
│  [Support / Contact]            │
└─────────────────────────────────┘
```

**Functions:**
- Children → edit name/birthday, add child, swipe-delete
- Reminder → set nightly notification time, enable/disable
- Subscription → view plan status, manage via RevenueCat/App Store
- Export → download all entries (text + audio archive)
- Recently Deleted → recover entries within 30-day window
- Delete account → permanent account removal
- About → version, legal links, support

---

## Screen Flow Map

```
                    Push Notification
                    ├── "Record" → Recording Screen
                    ├── "Open App" → Home Screen
                    └── "Later" → snooze 30 min

Home Screen ─────────────────────────────────────
  ├── [Search icon] → Search Screen
  │                     └── tap card → Entry Detail
  ├── [Gear icon] → Settings Screen
  ├── [Core Memories btn] → Core Memories Screen
  │                          └── tap card → Entry Detail
  ├── [Record btn] → Recording Screen
  │                    └── after record → Entry Detail
  ├── [Pencil btn] → Entry Detail (blank, text-only)
  └── tap entry card → Entry Detail
```
