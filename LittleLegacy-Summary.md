# LittleLegacy — High-Level Summary

**LittleLegacy** is a **voice-first memory journal app for parents of young children**. Parents tap a button, speak for up to 60 seconds about their child's day, and the app auto-transcribes, tags, and organizes that entry into a searchable archive — preserving both the text and the original audio recording forever.

**Core value prop:** "You'll never forget the little things." It eliminates the friction of traditional journaling by making capture as easy as a voice memo, while keeping everything organized, searchable, and permanent.

---

## Core Market & Demographic

**Primary user (MVP):** Moms of toddlers (ages 0-5)

**Why this demographic:**
- Highest emotional urgency to preserve fleeting childhood moments
- Most likely to journal but least likely to have time for it
- High lifetime value — once recordings accumulate, switching costs are enormous (you can't replicate your child's "firsts" elsewhere)
- Strong word-of-mouth networks (parenting groups, mom influencers)

**Monetization:** Subscription — $3/month or $30/year after a free trial, with future revenue from keepsake print books.

**Key differentiator:** No competitor leads with voice. The preserved audio becomes irreplaceable over time — imagine a grandchild hearing their grandparent describe their parent's first steps.

---

## Key Features (MVP)

- **Voice recording** with on-device transcription (< 5 seconds)
- **Original audio preservation** — the parent's voice is kept forever
- **Per-child organization** — each child gets their own memory journal/tab
- **Auto-tagging** — entries tagged by topic (humor, milestone, first, birthday, etc.)
- **Auto-detection** — app identifies which child an entry is about from the transcript
- **Full-text search** across all transcripts with child/date/topic filters
- **Push notifications** — gentle daily bedtime prompts with rotating text
- **Two entry paths** — notification tap or open-app flow, voice or text
- **Onboarding** — first saved entry in < 90 seconds

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React Native + Expo (TypeScript) |
| UI | NativeWind (Tailwind CSS for RN) |
| State | Zustand |
| Speech-to-Text | @react-native-voice/voice |
| Backend | Supabase (PostgreSQL + Auth + Storage) |
| Auth | Apple Sign-In + Google Sign-In + Email |
| Payments | RevenueCat |
| Analytics | PostHog |
| AI Tagging (V2) | Anthropic Claude API (Haiku) |
| Builds | Expo EAS Build |
| Platform | iOS-first launch |

---

## Roadmap

- **MVP (Month 1-3):** Voice capture, transcription, child profiles, search, notifications, trial + paywall
- **V1.5 (Month 4-6):** "On this day" resurfacing, milestone celebrations, LLM tagging, entry sharing
- **V2 (Month 6-12):** Partner sharing, photo-to-memory prompts, natural language search, keepsake book builder
- **V3+ (Year 2):** Interview mode (child's own voice), collaborative family timeline, export options

---

## Success Metrics

- **North Star:** Monthly active recording users (1+ entry/month)
- **Key targets:** 40%+ trial-to-paid conversion, 3+ entries/user/week, < 2 min time to first entry

---

## Current Status

Planning/design phase — comprehensive specs, functional requirements, UI mockups, and theme designs are complete. No production code yet.
