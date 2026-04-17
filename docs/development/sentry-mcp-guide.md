# Sentry MCP — Reference Guide

A practical playbook for using the Sentry MCP server with Claude Code on Forever Fireflies. If we find ourselves running the same workflows repeatedly, graduate this into a proper skill under `.claude/skills/`.

## What it is (ELI5)

The Sentry MCP is a **translator between Claude Code and your Sentry dashboard**. Instead of you opening Sentry in a browser, copying a stack trace, and pasting it into chat, Claude asks Sentry directly — "what are the worst unresolved errors this week?" — and gets structured answers back with stack traces, trace IDs, tags, and breadcrumbs.

Think of it like a phone line between Claude and Sentry. Claude can call Sentry, ask specific questions, and hang up — all without you leaving chat.

## Connection details

- **Organization:** `foreverfireflies` (`https://foreverfireflies.sentry.io`)
- **Project:** `forever-fireflies`
- **Region URL:** `https://us.sentry.io` (must be passed to tools that accept it)
- **Auth:** OAuth via `claude mcp add --transport http sentry https://mcp.sentry.dev/mcp`

If a call fails silently or with an auth error, run `/mcp` → clear auth → re-authenticate.

## The toolbelt

The MCP exposes ~20 tools grouped into four buckets. **It is mostly read-only** — the only mutation is `update_issue`. You cannot create issues, delete data, or modify alerts.

| Group | Tools | When to use |
|---|---|---|
| **Navigate** | `whoami`, `find_organizations`, `find_projects`, `find_releases`, `find_teams` | Starting a fresh session — get your bearings |
| **Search** | `search_issues`, `search_events` | Natural-language queries ("unresolved crashes last 14 days") |
| **Dig in** | `get_sentry_resource`, `get_issue_tag_values`, `get_profile_details`, `get_replay_details`, `search_issue_events`, `get_event_attachment` | Drill into a specific issue — stack trace, tags, breadcrumbs |
| **Fix** | `analyze_issue_with_seer`, `update_issue` | Seer = Sentry's built-in AI debugger. Proposes root cause and often a diff |

## Hard rules (non-obvious landmines)

These are the rules Sentry's own cookbook flags as showstoppers. Bake them into every prompt.

- **No boolean operators in searches.** `search_issues` 400s on `OR` / `AND`. Run **one query per issue type** — e.g. search "N+1 queries" and "slow db query" as two separate calls, not one combined query.
- **Use single-topic natural-language queries.** *"Unresolved crashes affecting 100+ users"* ✅. *"Crashes OR performance issues from last week"* ❌.
- **Seer is optimized for errors, not performance.** For N+1s and slow DB queries, Seer may not return a fix. Fall back to analyzing trace data directly.
- **Always pass project + org slugs explicitly.** Fresh sessions don't remember.
- **Always dedup before opening PRs.** `gh pr list --search "<prefix>:"` — otherwise a scheduled run re-opens the same fix every Monday.
- **Cap PRs per run** (start with 1–2). Auto-generated PRs are drafts, not gospel.
- **Repro before trusting a fix.** Seer can confidently fix the *wrong* thing. Verify locally against current code before merging.

## Workflow 1 — Debug a reported crash (on demand)

The "paste a Sentry link, get a fix" loop. Use this when a tester reports something broken.

1. **Paste the Sentry issue URL** directly into chat. Claude calls `get_sentry_resource` → stack, tags, breadcrumbs, trace ID.
2. **Run Seer:** `analyze_issue_with_seer` → proposed root cause + often a code diff.
3. **Verify locally** — repro the bug against current code before trusting the fix.
4. **Apply the fix**, commit, push.
5. **Close the loop:** `update_issue` → resolved.

**Prompt template:**
```
Here's a Sentry issue: <paste URL>
Pull the full details, run Seer, and propose a fix.
Before applying, tell me how to repro locally so I can
verify the before/after.
```

## Workflow 2 — Pre-build sweep (recommended for Forever Fireflies)

Run this **before every `eas build`** to catch regressions before they ship.

**Prompt template:**
```
Check Sentry for unresolved issues in the forever-fireflies
project over the last 7 days. Group by release. Flag anything
that started appearing in 1.0.x. Short summary — no fixes yet.
```

This fits nicely with the existing pre-build ritual in `docs/development/build-guide.md` (the `git stash list` / `git status` sanity check).

## Workflow 3 — Post-release health check

After a new build reaches testers, verify it's not generating new error volume.

**Prompt template:**
```
Use find_releases to list the last 3 releases for
forever-fireflies. For the most recent one, search for
unresolved issues tagged with that release. Report anything
new since the previous release.
```

## Workflow 4 — Weekly performance triage (automated, not yet applicable)

Sentry's official cookbook recipe: a scheduled Claude Code task fires weekly, queries the slowest endpoints, runs Seer, opens PRs. **Don't use this yet** — Forever Fireflies is still in internal testing and doesn't have the error volume to justify automation. Revisit once you have a real user base generating real signal.

When the time comes, the essentials are:
- Scheduled task, e.g. Mondays 9am
- Separate searches per issue type (no booleans)
- `get_issue_details` → `analyze_issue_with_seer` → fallback to raw trace analysis
- Dedup via `gh pr list --search`
- Branch name: `perf/fix-<issue-id>-<date>`
- Cap: 2 PRs per run

Full scaffold: [sentry.io/cookbook/performance-bot-sentry-claude](https://sentry.io/cookbook/performance-bot-sentry-claude/)

## Gotchas specific to this project

- **Don't leak transcripts into Sentry queries.** The `process-entry` pipeline already sends transcripts to Claude for title/tag generation. Keep Sentry focused on **code failures**, not user content.
- **Memory staleness.** Org/project slugs are stable, but if a second Sentry project is added (e.g. landing-site monitoring), stored memory won't know about it. Re-run `find_projects` when in doubt.
- **OTA vs native builds:** Sentry tags events with release version — use `find_releases` to distinguish "bug in the JS bundle from last OTA update" from "bug in the native code from the last `eas build`."
- **The SDK reads the DSN directly** (per the `EXPO_PUBLIC_` lesson in `CLAUDE.md` / memory). Don't refactor Sentry init to go through `lib/config.ts` — it will silently break during `eas update`.

## Quick-reference prompts

Save these as go-to phrases:

| Goal | Prompt |
|---|---|
| Health check | *"Any unresolved Sentry issues in forever-fireflies from the last 14 days?"* |
| Deep dive | *"Pull full details and run Seer on Sentry issue `<ID or URL>`"* |
| Release diff | *"Compare unresolved issues between releases 1.0.1 and 1.0.2"* |
| User impact | *"Top issues by affected user count in the last 7 days"* |
| Tag explore | *"For Sentry issue `<ID>`, show all values of the `os.version` tag"* |

## Sources

- [Sentry MCP Server docs](https://docs.sentry.io/product/sentry-mcp/)
- [Weekly performance triage cookbook](https://sentry.io/cookbook/performance-bot-sentry-claude/)
- [getsentry/sentry-mcp on GitHub](https://github.com/getsentry/sentry-mcp)
- [@euboid — Sentry → Codex crash loop](https://x.com/euboid/status/2035072294666612789) (bookmarked)
- [@dweekly — the repro-before-fix caveat](https://x.com/dweekly/status/2035073000000000000) (bookmarked reply)

## Graduating this into a skill

If we find ourselves running **Workflow 1 or 2** more than ~weekly, convert this into a skill under `.claude/skills/sentry-triage/` with:
- A `SKILL.md` that encodes the hard rules + prompt templates
- A trigger description like *"Use when the user asks to check Sentry, investigate a crash, or verify release health"*
- Optional: a helper script that runs the pre-build sweep as one command

Until then, this doc is the reference.
