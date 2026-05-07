# Prompt for the Rival Model

Paste this into a fresh Gemini / GPT-5 / o-series session, then attach (or paste below it) all files listed in `MANIFEST.md`.

---

You are a senior application security engineer with deep expertise in Postgres Row-Level Security, Supabase Edge Functions, React Native + Expo client security, OAuth flows, and OWASP Top 10. I'm asking you to perform an independent security audit of a React Native + Supabase app called **Forever Fireflies** — a parenting journal that stores children's names, birthdays, audio recordings, and AI-processed transcripts.

## Your task

Find security issues. Be specific. For each finding give me:

1. **Severity** — Critical / High / Medium / Low / Note
2. **File and line number** (e.g. `supabase/migrations/20260301000019_create_rls_policies.sql:71`)
3. **What's wrong** — the exact mechanism
4. **How an attacker exploits it** — concrete steps, no hand-waving
5. **Recommended fix** — concrete code, not "consider X"
6. **Effort estimate** — Trivial / Small / Medium / Large

## Threat model

- **In scope:** authenticated app users abusing other users' data (cross-user reads/writes/deletes); attackers with the public function URLs; an attacker who steals an unlocked phone (data-at-rest); supply-chain attacks via npm; prompt injection via voice recording transcripts.
- **Out of scope:** attacks against Supabase / Apple / Google infrastructure; rooted/jailbroken-device attacks against on-device crypto (assume the OS data partition encryption is intact); insider attacks by family members the user has invited (different threat model).

## Critical-asset map

The data this app must protect, in priority order:

1. Children's names + birthdays (PII for minors — legal and reputational damage if leaked)
2. Audio recordings + transcripts (often contain children's names spoken naturally)
3. User account + auth tokens
4. Subscription / billing state (in `profiles.subscription_status`, `trial_ends_at`)
5. Push tokens (lower priority but still bound to identifiable users)

## What I've already audited (be aware, don't duplicate, but DO challenge)

A Claude-led pass found these top items. **Your job is to find what Claude missed.** If you agree with one of these, that's fine — but spend most of your effort hunting for *new* findings.

- High: cross-user audio file destruction via attacker-controlled `entries.audio_storage_path` exploited by `purge-deleted` (service role bypasses storage RLS).
- High: `send-notifications` and `purge-deleted` Edge Functions have no Authorization check at all (`verify_jwt = false` + no manual Bearer check).
- High: `process-entry` has no input length cap, no prompt-injection delimiter wrapping, no AbortSignal timeout.
- High: `SENTRY_AUTH_TOKEN` checked into `eas.json` in plaintext.
- High: Plaintext PII in AsyncStorage (children names, transcripts, draft audio paths).
- High: `draft-storage` not cleared on user-switch — previous user's drafts persist.
- Medium: `children_update_family` policy missing `WITH CHECK`.
- Medium: `entries.is_deleted` filter not enforced at RLS — relies on every client query remembering to filter.
- Medium: PostHog `identify` sends user email.
- Medium: Sentry `beforeBreadcrumb` covers navigation only, not console — console PII could leak.
- Medium: Cron schedule changed from every-minute to every-5-min in migration 037; ±2-min Edge Function window may now miss notifications.
- Medium: No CSP / security headers on the static landing site.
- Medium: `EXPO_PUBLIC_BYPASS_PAYWALL` is a build-time backdoor compiled into all bundles (production sets `false` via env, but the branch ships).
- Medium: Password reset tokens transit through the user's browser via the bridge page.
- Medium: Android `allowBackup` not set to `false` — auto-backup of AsyncStorage to Google Drive.

## Where to focus your novel-finding hunt

- **Race conditions** in concurrent writes (e.g., two family members editing the same entry, owner-transfer flows, sign-out-during-mutation).
- **Time-of-check vs. time-of-use (TOCTOU)** in service-layer auth — does anything do `getSession()` then later mutate, where the session could expire mid-operation?
- **Indirect IDOR** — places where the client passes a UUID that gets used in a query, but the query trusts that the UUID was obtained legitimately.
- **Attacks on the `auto_family_trigger`** (migration 005) and `handle_new_child` (migration 024) — both are `SECURITY DEFINER`. Can a crafted INSERT bypass intent?
- **Attacks on `register_device` RPC** — the DELETE-then-INSERT pattern. What if two users race to register the same push token?
- **Quota exhaustion vectors** — is there any path where one user can blow past Supabase function quotas (sustained calls, large bodies, etc.) costing the project money? I caught the obvious ones; what subtle ones exist?
- **Prompt injection beyond the obvious** — `process-entry` includes the system tag taxonomy in the system prompt. Can a user craft a `tags` row to inject? (RLS prevents inserting `source = 'system'` tags, but check the chain end-to-end.)
- **Subscription tier enforcement** — currently no paid features. The Claude pass flagged that the bypass is build-time. What other enforcement gaps exist when the paid tier ships?
- **Storage path manipulations** — `entry-media` paths are `{user_id}/{entry_id}/photo_{order}.jpg`. Can the third segment be manipulated? What about Unicode / null-byte / `..`-style traversals?
- **Auth-flow corner cases** — what happens if a user changes their email mid-session? What if Apple Sign-In returns a "private relay" email that later changes?

## Format your output as

```
# Forever Fireflies — Independent Security Audit
## By <model>, <date>

## Summary
- N Critical, N High, N Medium, N Low

## Findings I agree with from the Claude pass
- (list, one line each, no need to re-explain)

## NEW findings (not in the Claude pass)
### N-A. <severity> — <one-line description>
- Where: file:line
- What: ...
- Exploit: ...
- Fix: ...
- Effort: ...
```

## Final ground rule

Don't be polite. If you think the Claude pass got something wrong, say so. If you think something flagged as High should be Critical, say so. Disagreement is the value of this exercise.

Now, audit the attached files.
