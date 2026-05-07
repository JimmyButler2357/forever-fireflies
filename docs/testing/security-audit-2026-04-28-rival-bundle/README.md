# Rival-Model Cross-Check Bundle — Security Audit 2026-04-28

This bundle is the input to **Section 1.4** of `docs/testing/pre-launch-double-check.md`: a one-shot security review of Forever Fireflies by a non-Claude model (Gemini 3 / GPT-5 / o-series). The Claude-led audit is in `docs/testing/security-audit-2026-04-28.md`. This bundle exists to surface findings the Claude pass may have missed — different model architectures find different bugs.

## How to run it

1. Open Gemini AI Studio (gemini.google.com) or GPT-5 in ChatGPT — pick whichever you prefer. (For best results, use the most capable reasoning model.)
2. Start a fresh session — do not reuse a thread that has prior context about Forever Fireflies.
3. Paste the prompt from `PROMPT.md` (or upload the files listed in `MANIFEST.md` directly to the model).
4. Run the audit. Capture the model's report.
5. Append the report to `docs/testing/security-audit-2026-04-28.md` under a new section titled "Rival-model cross-check — <Model name>, <YYYY-MM-DD>".
6. For any findings the rival model surfaces that the Claude pass missed, file them as new severity-tagged items in the remediation checklist at the top of the audit doc.

## Why this matters

Per [@arvidkahl](https://x.com/arvidkahl/status/2011857112939544991) and [@burakeregar](https://x.com/burakeregar/status/2011056036673961998) (both bookmarked in your knowledge base): **80%+ of AI-built apps ship with critical vulnerabilities, and the model that built the code has blind spots when reviewing the same code**. Rival-model review is the cheapest way to catch those blind spots.

This is not a substitute for the live RLS test (`security-audit-2026-04-28-rls-test.sql`) — it's a complementary code-read pass.

## What's in the bundle

- `PROMPT.md` — the prompt to paste into the rival model.
- `MANIFEST.md` — the list of files that should be uploaded or pasted alongside the prompt.
- `findings-template.md` — empty template for capturing the rival model's findings in a comparable format to the Claude pass.

## What's NOT in the bundle (and why)

- `.env.local` — never share real credentials with another model.
- `node_modules/` and `package-lock.json` — supply-chain risk should already be covered by `npm audit`; pasting the lockfile into a chat interface adds noise.
- `landing/playgrounds/` — experimental UI, not security-relevant.
- Test files (`__tests__/`, `__mocks__/`) — gitignored, not part of the production attack surface.

## Time budget

A capable rival model should finish a thorough pass in 15–30 minutes of reasoning. Don't rush it. If the model wants to ask follow-up questions about the threat model, encourage it — those questions are themselves diagnostic.
