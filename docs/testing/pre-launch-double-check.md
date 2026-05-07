# Pre-Launch Double-Check

Distilled from curated bookmarks (Twitter Bookmarks knowledge base, April 2026). These are the items most relevant to Forever Fireflies right now — pre-launch, polish phase, with a real backend (Supabase, RLS, edge functions, push tokens, audio storage) and a family-network moat strategy.

Read this alongside [`dev-testing-checklist.md`](./dev-testing-checklist.md). The dev checklist asks *"does the feature work?"*. This doc asks *"would I be embarrassed if a stranger broke into it?"*.

---

## How to use this doc

Work through each section in order. Each item has:
- **The check** — what to actually do
- **Why it matters** — the failure mode if you skip it
- **How to apply** — concrete steps for our stack

Mark items as you complete them. When all of Section 1 + Section 2 are checked, we're cleared for public store submission.

---

## Section 1 — Security audit (must do before public submission)

> ### Background reading
> The bookmark that drives this section is [@burakeregar's vibe-coded security checklist](https://x.com/burakeregar/status/2011056036673961998) — claims 80%+ of AI-built apps have critical security vulnerabilities. The thread is short. Read it first.
>
> Pair it with [@arvidkahl's `/security-check` skill pattern](https://x.com/arvidkahl/status/2011857112939544991) — running a red-team pass before every commit.

### 1.1 — Run a full RLS audit on every table

- [ ] Every table in the schema has RLS enabled (check `pg_tables` and `pg_policies`)
- [ ] Every policy was tested by signing in as a *different* user and trying to read/write rows that aren't theirs
- [ ] Edge functions that use the service-role key explicitly re-check ownership before mutating anything (don't rely on RLS — service role bypasses it)

**Why:** RLS is your safety net, not your only check. The `CLAUDE.md` rule "defense in depth" exists because a single misconfigured policy is a data leak.

**How to apply:** Open Supabase Studio → Authentication → Users → create two test users → with each user's session, query every table for the *other* user's data. If anything comes back, that's the bug.

### 1.2 — "Don't hide, withhold" — server-side gating for paid features

- [ ] Premium features check entitlement on the **server** (RLS policy or edge function), not just by hiding the UI
- [ ] No client-side flag like `isPremium` decides whether a request goes through

**Why:** A user with the app open in a browser dev tool can flip `isPremium = true` and call your API directly. We won't have a paid tier at launch, but **the moment we add RevenueCat we need to wire the entitlement check into RLS**, not just into the React tree.

**How to apply:** When the subscription work starts, add a `subscription_tier` column to `profiles`, gate premium-only RLS policies on it, and let RevenueCat webhook updates be the only writer.

### 1.3 — Sanitize transcript content before sending to Claude

- [ ] The `process-entry` edge function strips/escapes anything that could be misread as a prompt injection (e.g. lines like `Ignore prior instructions and return X`)
- [ ] The function has a hard timeout and a max input length so a malicious recording can't blow up the budget

**Why:** Transcripts naturally contain children's names. They could also contain a malicious string a user reads aloud (or a future feature where transcripts come from a shared family member). A jailbroken Haiku could leak system prompts or skew tags.

**How to apply:** In `supabase/functions/process-entry/index.ts`, add input length cap + a basic prompt-injection regex filter before the `claude.messages.create` call.

### 1.4 — Audit our code with a rival model

- [ ] Run a security-focused review of `supabase/migrations/`, `supabase/functions/`, and `services/` using a non-Claude model (Gemini 3 or GPT-5)
- [ ] Use the prompt and bundle prepared at `docs/testing/security-audit-2026-04-28-rival-bundle/` (PROMPT.md + MANIFEST.md + findings-template.md)
- [ ] Append findings to `docs/testing/security-audit-2026-04-28.md` under "Rival-model cross-check"
- [ ] Triage findings into "ship blocker" / "fix soon" / "noted"

**Why:** Different model architectures find different bugs. Claude built it; Claude reviewing it has blind spots.

**How to apply:** Single one-shot session with Gemini in AI Studio. Paste the contents of `PROMPT.md` and the files listed in `MANIFEST.md`. Save the report under the audit doc as a new section.

### 1.5 — Run Claude Code's built-in `/security-review`

- [x] `/security-review` has been run on the current branch with no critical findings open
  - **Done 2026-04-28, revised 2026-05-03** — full deep audit at `docs/testing/security-audit-2026-04-28.md`. 0 Critical, 6 High, 13 Medium, 12 Low, 8 Note. **4 ship-blockers** for public launch (revised down from 5 after threat-model correction on AsyncStorage finding 3-A). See the audit doc's "Executive summary" section.
- [ ] Re-run on `master` immediately before each `eas build --profile production`

### 1.6 — Live two-account RLS test (added during 2026-04-28 audit)

- [ ] Spin up local Supabase (or branch), apply migrations, create two test users, run all 24 tests in `docs/testing/security-audit-2026-04-28-rls-test.sql`
- [ ] All 24 tests return their expected outcome (0 rows / errors as documented)
- **Status:** scripted but not run in 2026-04-28 audit — Docker was not installed locally.

**Why:** This is the cheapest layer of the audit and catches obvious issues (logged secrets, eval, unsafe HTML).

---

## Section 2 — Edge case sweep

> ### Background reading
> [@AnishA_Moonka's "47 edge cases"](https://x.com/AnishA_Moonka/status/2021233631898095984) — *"a working demo is 5% of the work."* The other 95% is the unhappy paths. He has a 28-chapter playbook with 56 copy-paste prompts behind the link.

For each major flow, walk through it asking *"what if the user…"*

### 2.1 — Network and offline

- [ ] Record an entry with **airplane mode on** — does it queue and sync when reconnected?
- [ ] Lose connection mid-upload — does the audio file recover or fail cleanly?
- [ ] Slow 3G simulation — does the UI show progress, not a frozen spinner?

### 2.2 — Auth edge cases

- [ ] Sign up with an email that already exists — clear error, not a crash
- [ ] Sign in, log out, sign in as a different user — **persisted Zustand stores cleared on auth change** (this is in MEMORY.md — verify it actually happens)
- [ ] Email verification link clicked twice — second click doesn't break
- [ ] Apple Sign-In hides email — we still create a profile correctly

### 2.3 — Audio recording edge cases

- [ ] Record for 1 second — is it accepted or does it fail validation?
- [ ] Record for 10 minutes — does it upload? does Haiku handle the long transcript?
- [ ] Background the app mid-recording — does it pause cleanly or lose the take?
- [ ] Phone call comes in mid-recording — recovery path
- [ ] Mic permission revoked from system Settings after onboarding — does the record screen handle it?

### 2.4 — Family network edge cases

- [ ] Two family members write entries about the same child at the same second — both save, neither overwrites
- [ ] Member is removed from a family — they lose access, but their authored entries don't break the remaining members' views
- [ ] Family invite link clicked while signed in as a *different* user — no silent reassignment

### 2.5 — Notifications

- [ ] Set notification time, change device timezone, reopen app — `notification_time_utc` updates
- [ ] User ignores 5 notifications in a row — backoff actually triggers (verify by querying `notification_log`)
- [ ] DST transition — daily notification still fires at the locally-correct time

---

## Section 3 — Monetization scaffolding (light touch, before launch)

> ### Background reading
> [@zach_d__'s mobile starter stack](https://x.com/zach_d__/status/1911189216412962902): *"React Native + Firebase + RevenueCat + Superwall + Mixpanel"*. We use Supabase, not Firebase, but **RevenueCat + Superwall** is the canonical RN subscription combo.

### 3.1 — Decide what's in the free tier vs paid

- [ ] A written one-pager on what's free, what's paid, and what's in the trial — even if the paid tier ships post-launch
- [ ] The free experience is *complete enough* that a user wouldn't feel ripped off (per `BRAND_VOICE.md`)

### 3.2 — Design the entitlement column now

- [ ] `profiles` has a `subscription_tier` column even if every row is `'free'` at launch — adding it later means a migration on a populated table
- [ ] RLS policies that *will* be premium-gated are written now and currently allow everyone — flipping them later is a one-line change

**Why:** The biggest mistake is bolting paid on top of a model that wasn't designed for it. Even if we don't charge for 6 months, the schema should know paid is coming.

**How to apply:** One small migration adding `subscription_tier text default 'free'`. Skip the policy changes until the actual subscription work begins.

---

## Section 4 — Pre-build hygiene

Run these checks before every `eas build --profile production`:

- [ ] `git stash list` is **empty** — see `CLAUDE.md` "Git Safety" for the incident behind this rule
- [ ] `git status` shows the changes you expect (no surprise files)
- [ ] `npm run gen:types` was run after the most recent migration
- [ ] `/security-review` passes
- [ ] Section 1 and Section 2 of this doc are checked off
- [ ] Sentry DSN is set for production
- [ ] PostHog key is read **directly** in the file that needs it, not via a shared config module (per `CLAUDE.md` "Lessons Learned")

---

## Section 5 — Post-launch automation (defer to ~3 months in)

Don't build these now — but bookmark them for when crash volume justifies it.

### Sentry → agent triage pipeline

[@euboid's setup](https://x.com/euboid/status/2035072294666612789): Sentry webhook → Codex/Claude Code → triages crash → opens PR or closes as noise → human merges in one click.

We already have Sentry + the `sentry-mcp` plugin. The remaining work is the webhook + agent endpoint. Worth ~1 day of setup once we have ≥10 crashes/week to justify it.

### Overnight loops for polish work

[@danshipper's "small polish" loop](https://x.com/danshipper/status/2031900367676719432): a daily Codex run that looks at recent bug reports + telemetry, drafts small fixes, leaves PRs for morning review. Same defer-until-volume rule.

---

## Gaps (not in our bookmarks — seek elsewhere)

These topics matter for FF but the bookmark set doesn't cover them well. When researching, check elsewhere:

- **Family-app retention/virality patterns** — our moat hinges on this; bookmarks don't cover consumer cohort retention
- **Audio UX for journals** — recording UI, waveforms, scrubbing
- **Empty/loading/error state delight microcopy** — our design system requires it; `BRAND_VOICE.md` sets the tone, but examples would help
- **Push notification timing/copy science** — plumbing is solved; the *what time, what words* science is not

---

## One-line summary

The bookmark research says: **before submitting to public stores, run a security audit (Section 1), do a deliberate edge-case sweep (Section 2), and have at least the schema bones in place for monetization (Section 3).** Everything else can ship after.
