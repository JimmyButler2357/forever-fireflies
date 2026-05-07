# Rival-Model Findings — Forever Fireflies Security Audit

**Model:** _(e.g., Gemini 3 Pro, GPT-5, o5)_
**Date run:** _(YYYY-MM-DD)_
**Reviewer:** _(your name)_

---

## Summary

- Critical: N
- High: N
- Medium: N
- Low: N
- Note: N

## Agreement with Claude pass

| Claude finding | Rival model agrees? | Notes |
|---|---|---|
| 2-A `audio_storage_path` cross-user destruction | (yes/no/partial) | |
| 2-B `send-notifications` no auth | | |
| 2-C `purge-deleted` no auth | | |
| 2-D `process-entry` no length cap or prompt-injection wrapping | | |
| 2-E Edge function PII logging | | |
| 2-F dedup/backoff disabled | | |
| 3-A AsyncStorage plaintext PII | | |
| 3-B draft-storage not cleared on user switch | | |
| 3-C PostHog email | | |
| 3-D Sentry console breadcrumbs | | |
| 1-A `children_update_family` no WITH CHECK | | |
| 1-E `is_deleted` not RLS-enforced | | |
| 4-A `SENTRY_AUTH_TOKEN` in eas.json | | |
| 4-D Android `allowBackup` not false | | |
| 5-A Password reset tokens via browser | | |
| 6-A No CSP on landing site | | |

## NEW findings (not in Claude pass)

### N-A. (severity) — (one-line description)
- **Where:** file:line
- **What:** ...
- **Exploit:** ...
- **Fix:** ...
- **Effort:** ...

### N-B. ...

## Disagreements with Claude pass severity

_(any item the rival model thinks should be a different severity)_

## Process notes

_(any methodology observations from the rival model — e.g., "I would have wanted to see X file but it wasn't in the bundle")_
