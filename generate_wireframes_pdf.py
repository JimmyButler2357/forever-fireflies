#!/usr/bin/env python3
"""Generate a clean PDF of the Core Memories wireframes."""

from fpdf import FPDF

SANS = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
SANS_BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
MONO = "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf"
MONO_BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSansMono-Bold.ttf"

class WireframePDF(FPDF):
    def setup_fonts(self):
        self.add_font("Sans", "", SANS, uni=True)
        self.add_font("Sans", "B", SANS_BOLD, uni=True)
        self.add_font("Sans", "I", SANS, uni=True)  # use regular as italic fallback
        self.add_font("Mono", "", MONO, uni=True)
        self.add_font("Mono", "B", MONO_BOLD, uni=True)

    def header(self):
        if self.page_no() > 1:
            self.set_font("Sans", "I", 8)
            self.set_text_color(150, 150, 150)
            self.cell(0, 8, "Core Memories - Page Wireframes", align="R")
            self.ln(4)

    def footer(self):
        self.set_y(-15)
        self.set_font("Sans", "I", 8)
        self.set_text_color(150, 150, 150)
        self.cell(0, 10, f"Page {self.page_no()}/{self.alias_nb_pages()}", align="C")

    def section_title(self, title):
        self.set_font("Sans", "B", 16)
        self.set_text_color(40, 40, 40)
        self.cell(0, 12, title, new_x="LMARGIN", new_y="NEXT")
        self.ln(2)

    def code_block(self, text):
        self.set_font("Mono", "", 8.5)
        self.set_text_color(30, 30, 30)
        # Light gray background
        x = self.get_x()
        y = self.get_y()
        lines = text.split("\n")
        line_h = 4.2
        block_h = len(lines) * line_h + 6
        # Check if we need a page break
        if y + block_h > self.h - 20:
            self.add_page()
            y = self.get_y()
        self.set_fill_color(245, 245, 245)
        self.set_draw_color(220, 220, 220)
        self.rect(x - 2, y - 1, self.w - 2 * self.l_margin + 4, block_h, style="FD")
        self.ln(2)
        for line in lines:
            self.cell(0, line_h, line, new_x="LMARGIN", new_y="NEXT")
        self.ln(4)

    def functions_block(self, items):
        self.set_font("Sans", "B", 10)
        self.set_text_color(80, 80, 80)
        self.cell(0, 7, "Functions:", new_x="LMARGIN", new_y="NEXT")
        self.set_font("Sans", "", 9)
        self.set_text_color(60, 60, 60)
        for item in items:
            # Check for page break
            if self.get_y() > self.h - 20:
                self.add_page()
            self.cell(5, 5, "")
            self.cell(0, 5, f"•  {item}", new_x="LMARGIN", new_y="NEXT")
        self.ln(6)


pdf = WireframePDF()
pdf.setup_fonts()
pdf.set_auto_page_break(auto=True, margin=20)
pdf.set_left_margin(15)
pdf.set_right_margin(15)

# ── Title Page ──
pdf.add_page()
pdf.ln(50)
pdf.set_font("Sans", "B", 32)
pdf.set_text_color(30, 30, 30)
pdf.cell(0, 15, "Core Memories", align="C", new_x="LMARGIN", new_y="NEXT")
pdf.ln(4)
pdf.set_font("Sans", "", 16)
pdf.set_text_color(100, 100, 100)
pdf.cell(0, 10, "Page Wireframes", align="C", new_x="LMARGIN", new_y="NEXT")
pdf.ln(8)
pdf.set_font("Sans", "", 11)
pdf.set_text_color(140, 140, 140)
pdf.cell(0, 8, "What's on each page, where it sits, what it does.", align="C", new_x="LMARGIN", new_y="NEXT")
pdf.ln(30)
pdf.set_font("Sans", "", 10)
pdf.cell(0, 8, "February 2026", align="C", new_x="LMARGIN", new_y="NEXT")

# ── 1. Home Screen ──
pdf.add_page()
pdf.section_title("1. Home Screen")
pdf.code_block(
    '┌─────────────────────────────────┐\n'
    '│ TOP BAR                         │\n'
    '│  Logo/App Name    [Search] [⚙]  │\n'
    '├─────────────────────────────────┤\n'
    '│ CORE MEMORIES BUTTON            │\n'
    '│  [♥ Core Memories]              │\n'
    '│  → goes to favorites screen     │\n'
    '├─────────────────────────────────┤\n'
    '│ CHILD TABS                      │\n'
    '│  [All] [Emma] [Liam] [...]      │\n'
    '│  horizontal scroll, tap=filter  │\n'
    '├─────────────────────────────────┤\n'
    '│ ENTRY CARDS (scrollable list)   │\n'
    '│                                 │\n'
    '│  ┌─ Card ─────────────────────┐ │\n'
    '│  │ Feb 18, 2026               │ │\n'
    '│  │ [Emma] [Liam]  ← pills    │ │\n'
    '│  │ "She said her first full..." │\n'
    '│  │ [milestone] [funny] ← tags │ │\n'
    '│  └────────────────────────────┘ │\n'
    '│                                 │\n'
    '│  ┌─ Card ─────────────────────┐ │\n'
    '│  │ Feb 17, 2026               │ │\n'
    '│  │ [Emma]                     │ │\n'
    '│  │ "Refused to wear shoes..." │ │\n'
    '│  │ [funny]                    │ │\n'
    '│  └────────────────────────────┘ │\n'
    '│                                 │\n'
    '│  (reverse chronological)        │\n'
    '│                                 │\n'
    '├─────────────────────────────────┤\n'
    '│ BOTTOM ACTION AREA              │\n'
    '│                                 │\n'
    '│         [✏]  [  MIC  ]          │\n'
    '│        text    RECORD           │\n'
    '│       (small)  (BIG)            │\n'
    '│                                 │\n'
    '│  Record = open Recording Screen │\n'
    '│  Pencil = open blank Entry      │\n'
    '└─────────────────────────────────┘'
)
pdf.functions_block([
    "Search icon → Search Screen",
    "Gear icon → Settings Screen",
    "Core Memories button → Core Memories Screen",
    "Child tabs → filter entry cards by child (\"All\" = everything)",
    "Tap entry card → Entry Detail Screen",
    "Record button → Recording Screen",
    "Pencil button → blank Entry Detail (text-only, no audio)",
])

# ── 2. Push Notification ──
pdf.add_page()
pdf.section_title("2. Push Notification (Nightly Prompt)")
pdf.code_block(
    '┌─────────────────────────────────┐\n'
    '│ CORE MEMORIES                   │\n'
    '│ "What made you smile today?"    │\n'
    '│                                 │\n'
    '│ [Record]  [Open App]  [Later]   │\n'
    '└─────────────────────────────────┘'
)
pdf.functions_block([
    "Fires at user-set reminder time each evening",
    "Prompt text rotates nightly (warm, never guilt-inducing)",
    "\"Record\" → launches straight to Recording Screen",
    "\"Open App\" → launches to Home Screen",
    "\"Remind Me Later\" → snoozes 30 minutes",
    "Tap notification body (no action) → Home Screen",
    "If ignored for days, frequency reduces (never increases)",
])

# ── 3. Recording Screen ──
pdf.ln(6)
pdf.section_title("3. Recording Screen")
pdf.code_block(
    '┌─────────────────────────────────┐\n'
    '│ TOP BAR                         │\n'
    '│  [X Cancel]                     │\n'
    '├─────────────────────────────────┤\n'
    '│ PROMPT CARDS                    │\n'
    '│                                 │\n'
    '│  ┌────────────────────────────┐ │\n'
    '│  │ Any new words or phrases?  │ │\n'
    '│  └────────────────────────────┘ │\n'
    '│  ┌────────────────────────────┐ │\n'
    '│  │ What made them laugh?      │ │\n'
    '│  └────────────────────────────┘ │\n'
    '│  ┌────────────────────────────┐ │\n'
    '│  │ Did they try something new?│ │\n'
    '│  └────────────────────────────┘ │\n'
    '│                                 │\n'
    '│  (age-specific, shuffled daily) │\n'
    '│  (fade out once recording       │\n'
    '│   starts)                       │\n'
    '│                                 │\n'
    '├─────────────────────────────────┤\n'
    '│ RECORDING AREA                  │\n'
    '│                                 │\n'
    '│  BEFORE:                        │\n'
    '│         [  MIC  ]                │\n'
    '│       tap to start              │\n'
    '│                                 │\n'
    '│  DURING:                        │\n'
    '│      ~~~ waveform ~~~           │\n'
    '│         [ STOP ]                │\n'
    '│          0:34                   │\n'
    '│    (auto-stops at 1:00)         │\n'
    '│                                 │\n'
    '├─────────────────────────────────┤\n'
    '│ AFTER RECORDING — CHILD SELECT  │\n'
    '│ (bottom sheet / overlay)        │\n'
    '│                                 │\n'
    '│  Who is this about?             │\n'
    '│  [Emma] [Liam] [All/General]    │\n'
    '│  (tap one or more)              │\n'
    '│                                 │\n'
    '│  → transitions to Entry Detail  │\n'
    '│    with transcript + children   │\n'
    '│    assigned                     │\n'
    '└─────────────────────────────────┘'
)
pdf.functions_block([
    "Cancel/X → discard recording, go back",
    "Prompt cards → read-only inspiration (age-bracketed, 20-30 in bank)",
    "Record button → start recording, transforms to stop button",
    "Timer counts up, auto-stops at 60 seconds (MVP)",
    "After stop → child selection overlay appears",
    "Select child(ren) → go to Entry Detail with transcript populated",
    "\"All/General\" → auto-detection tries to identify child from transcript",
])

# ── 4. Entry Detail ──
pdf.add_page()
pdf.section_title("4. Entry Detail / Editor Screen")
pdf.code_block(
    '┌─────────────────────────────────┐\n'
    '│ TOP BAR                         │\n'
    '│  [← Back]          [☆ Fav] [DEL] │\n'
    '├─────────────────────────────────┤\n'
    '│ METADATA HEADER                 │\n'
    '│  Tuesday, February 18, 2026     │\n'
    '│  8:47 PM                        │\n'
    '│  [Emma ✕] [Liam ✕]  ← tappable │\n'
    '│  Emma: 2 years, 4 months       │\n'
    '│  Liam: 4 years, 1 month        │\n'
    '├─────────────────────────────────┤\n'
    '│ TAGS ROW                        │\n'
    '│  [milestone ✕] [funny ✕] [+]   │\n'
    '│  auto-generated, removable,     │\n'
    '│  can add custom                 │\n'
    '├─────────────────────────────────┤\n'
    '│ [* Regenerate transcription]   │\n'
    '│  (sends audio to cloud API for  │\n'
    '│   better accuracy. 1x per entry,│\n'
    '│   ~5/week cap)                  │\n'
    '├─────────────────────────────────┤\n'
    '│ TRANSCRIPT TEXT AREA            │\n'
    '│                                 │\n'
    '│  "She looked at me and said     │\n'
    '│   \'I love you to the moon and   │\n'
    '│   the stars and the dinosaurs\'  │\n'
    '│   and I just about lost it.     │\n'
    '│   She\'s been combining phrases  │\n'
    '│   like this all week..."        │\n'
    '│                                 │\n'
    '│  (editable, auto-saves)         │\n'
    '│  (subtle "Saved" indicator)     │\n'
    '│                                 │\n'
    '├─────────────────────────────────┤\n'
    '│ AUDIO PLAYBACK BAR              │\n'
    '│  [▶ Play]  ━━━●━━━━━━  0:34    │\n'
    '│  (hidden for text-only entries) │\n'
    '└─────────────────────────────────┘'
)
pdf.functions_block([
    "Back arrow → return to previous screen",
    "Star toggle → mark/unmark as Core Memory (favorite)",
    "Delete → confirmation dialog → soft delete (30-day recovery)",
    "Child pills → tappable to open picker, add/remove/change children",
    "Tags → auto-generated, removable via X, add custom via +",
    "Regenerate → cloud re-transcription (1 per entry, 5/week cap)",
    "Transcript → fully editable text, all changes auto-save",
    "Audio bar → play/pause/scrub original recording",
    "Same screen used for new entries and existing entries",
])

# ── 5. Search Screen ──
pdf.add_page()
pdf.section_title("5. Search Screen")
pdf.code_block(
    '┌─────────────────────────────────┐\n'
    '│ SEARCH BAR                      │\n'
    '│  [Q Search memories...      ]  │\n'
    '│  (auto-focuses keyboard)        │\n'
    '├─────────────────────────────────┤\n'
    '│ FILTER CHIPS (horizontal scroll)│\n'
    '│  [Child ▾] [Date range ▾]       │\n'
    '│  [milestone] [funny] [first]... │\n'
    '│  (combine with search text)     │\n'
    '├─────────────────────────────────┤\n'
    '│ RESULTS                         │\n'
    '│                                 │\n'
    '│  ┌─ Card ─────────────────────┐ │\n'
    '│  │ Jan 5, 2026                │ │\n'
    '│  │ [Emma]                     │ │\n'
    '│  │ "...her first steps        │ │\n'
    '│  │  across the living room..."│ │\n'
    '│  │ [milestone] [first]        │ │\n'
    '│  └────────────────────────────┘ │\n'
    '│                                 │\n'
    '│  (same card format as Home,     │\n'
    '│   matching text highlighted)    │\n'
    '│                                 │\n'
    '│  EMPTY STATE:                   │\n'
    '│  "No memories found. Try        │\n'
    '│   different keywords or         │\n'
    '│   filters."                     │\n'
    '└─────────────────────────────────┘'
)
pdf.functions_block([
    "Search bar → full-text search across all transcripts",
    "Filter chips → child (multi-select), date range, tags",
    "Filters combine with search text",
    "Results → same card format as Home, search terms highlighted",
    "Tap card → Entry Detail Screen",
])

# ── 6. Core Memories Screen ──
pdf.ln(6)
pdf.section_title("6. Core Memories Screen (Favorites)")
pdf.code_block(
    '┌─────────────────────────────────┐\n'
    '│ TOP BAR                         │\n'
    '│  [← Back]    Core Memories      │\n'
    '├─────────────────────────────────┤\n'
    '│ CHILD TABS                      │\n'
    '│  [All] [Emma] [Liam] [...]      │\n'
    '│  (same as Home Screen)          │\n'
    '├─────────────────────────────────┤\n'
    '│ FAVORITED ENTRY CARDS           │\n'
    '│                                 │\n'
    '│  (same card format as Home,     │\n'
    '│   only starred entries,         │\n'
    '│   reverse chronological)        │\n'
    '│                                 │\n'
    '│  EMPTY STATE:                   │\n'
    '│  "Tap the star on any entry     │\n'
    '│   to save it as a Core Memory." │\n'
    '└─────────────────────────────────┘'
)
pdf.functions_block([
    "Back → Home Screen",
    "Child tabs → filter favorites by child",
    "Tap card → Entry Detail Screen",
    "Mirrors Home Screen structure, only shows starred entries",
])

# ── 7. Settings Screen ──
pdf.add_page()
pdf.section_title("7. Settings Screen")
pdf.code_block(
    '┌─────────────────────────────────┐\n'
    '│ TOP BAR                         │\n'
    '│  [← Back]       Settings        │\n'
    '├─────────────────────────────────┤\n'
    '│ CHILDREN                        │\n'
    '│  Emma — birthday: Jun 12, 2023  │\n'
    '│  Liam — birthday: Oct 3, 2021   │\n'
    '│  (tap to edit name/birthday)    │\n'
    '│  (swipe to delete + confirmation│\n'
    '│   about what happens to entries)│\n'
    '│  [+ Add Child]                  │\n'
    '├─────────────────────────────────┤\n'
    '│ REMINDER                        │\n'
    '│  Time: [8:30 PM ▾]              │\n'
    '│  Enabled: [ON/OFF toggle]       │\n'
    '├─────────────────────────────────┤\n'
    '│ SUBSCRIPTION                    │\n'
    '│  Current plan: Premium Monthly  │\n'
    '│  [Manage / Upgrade]             │\n'
    '├─────────────────────────────────┤\n'
    '│ DATA & PRIVACY                  │\n'
    '│  [Export all entries]            │\n'
    '│  [Recently Deleted]             │\n'
    '│  [Delete account]               │\n'
    '├─────────────────────────────────┤\n'
    '│ ABOUT                           │\n'
    '│  Version 1.0.0                  │\n'
    '│  [Privacy Policy]               │\n'
    '│  [Terms of Service]             │\n'
    '│  [Support / Contact]            │\n'
    '└─────────────────────────────────┘'
)
pdf.functions_block([
    "Children → edit name/birthday, add child, swipe-delete",
    "Reminder → set nightly notification time, enable/disable",
    "Subscription → view plan status, manage via RevenueCat/App Store",
    "Export → download all entries (text + audio archive)",
    "Recently Deleted → recover entries within 30-day window",
    "Delete account → permanent account removal",
    "About → version, legal links, support",
])

# ── Screen Flow Map ──
pdf.ln(6)
pdf.section_title("Screen Flow Map")
pdf.code_block(
    '                Push Notification\n'
    '                ├── "Record" → Recording Screen\n'
    '                ├── "Open App" → Home Screen\n'
    '                └── "Later" → snooze 30 min\n'
    '\n'
    'Home Screen ─────────────────────────────────\n'
    '  ├── [Search icon] → Search Screen\n'
    '  │                     └── tap card → Entry Detail\n'
    '  ├── [Gear icon] → Settings Screen\n'
    '  ├── [Core Memories btn] → Core Memories Screen\n'
    '  │                          └── tap card → Entry Detail\n'
    '  ├── [Record btn] → Recording Screen\n'
    '  │                    └── after record → Entry Detail\n'
    '  ├── [Pencil btn] → Entry Detail (blank, text-only)\n'
    '  └── tap entry card → Entry Detail'
)

# Output
output_path = "/home/user/Core-Memories/Core-Memories-Wireframes.pdf"
pdf.output(output_path)
print(f"PDF generated: {output_path}")
