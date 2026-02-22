# LittleLegacy — Infrastructure & Scaling Guide

How the technical infrastructure needs to evolve as the app grows from 0 to 100K+ users. Reference this alongside the Product Spec (Section 10: Technical Stack) when making architecture decisions during development.

---

## 1. Launch Infrastructure (< 1K users)

| Service | Plan | Cost |
|---------|------|------|
| Supabase (DB + Auth + Storage + Edge Functions) | Pro | $25/mo |
| Expo EAS Build | Free tier (30 builds/mo) | $0 |
| Apple Developer Account | Required | $99/yr |
| RevenueCat | Free (< $2.5K MTR) | $0 |
| PostHog | Free (< 1M events/mo) | $0 |
| Website hosting (Vercel/Netlify) | Free tier | $0 |

**Total: ~$35/mo** (excluding domain, email, legal — see Business.md)

This is all you need. No custom servers, no Docker, no CI/CD pipelines, no DevOps knowledge required.

---

## 2. Infrastructure Cost Model by User Count

| Users | Supabase | Audio Storage | Claude API (V2) | EAS Build | Total Infra/mo |
|-------|----------|---------------|------------------|-----------|----------------|
| 100 | $25 | included | $0 (MVP keyword) | $0 | **~$25** |
| 1,000 | $25 | included (< 50GB) | $40 | $0 | **~$65** |
| 5,000 | $25-75 | ~$5 overage | $200 | $0-33 | **~$115-315** |
| 10,000 | $75 | ~$15/mo | $400 | $33 | **~$525** |
| 50,000 | $150+ | ~$100/mo | $2,000 | $33 | **~$2,285** |
| 100,000 | $300+ | ~$250/mo | $4,000 | $99 | **~$4,650** |

**Key takeaways:**
- At 1K paying users you're earning ~$2,550/mo against ~$65/mo in costs. Very healthy margins.
- Claude API tagging (V2) is the biggest scaling cost, but it's optional — MVP keyword matching costs $0.
- Storage grows linearly and never shrinks (audio accumulates), but the costs are modest even at scale.
- You don't hit real infrastructure pain points until 50K+, and by then you're earning $100K+/year.

---

## 3. Audio Storage — Retention Strategy

### The Decision
Audio preservation is currently the #1 emotional differentiator ("the parent's authentic voice is sacred"). But storing audio forever has cost implications at scale.

### Option A: Keep Audio Forever (Recommended for Paying Subscribers)
- **Cost:** ~100KB per 60-second AAC entry. At 5 entries/week/user, that's ~2MB/user/month.
- At 10,000 users: ~20GB/month new storage, ~240GB/year cumulative
- At 100,000 users: ~200GB/month new, ~2.4TB/year cumulative
- **Supabase Pro includes 100GB.** Overage is ~$0.021/GB/month on S3-equivalent pricing.
- At 10K users with 500GB total stored: ~$10/month in storage. Negligible vs. revenue.
- **Verdict:** For paying subscribers, audio storage costs are trivial relative to subscription revenue (~$0.04/user/month). Keep it forever.

### Option B: Delete Audio After 30-90 Days for Non-Converting Trial Users
- Users who start a free trial and never subscribe accumulate audio that will never generate revenue.
- **Recommendation:** Delete audio for expired trial accounts after 90 days. Keep the transcript (text is essentially free to store). If they later subscribe, the text is intact but audio is gone.
- This saves storage costs on the segment that matters most: high-volume, zero-revenue users.

### Option C: Don't Expose Audio to Users (Text-Only Experience)
- The app could transcribe audio and store only the text, never surfacing audio playback.
- **Tradeoff:** This removes the core emotional differentiator. "Imagine your grandchild hearing your voice" becomes impossible. Every competitor can do text journaling — the voice is your wedge.
- **Recommendation:** If you go this route, keep the original audio stored for at least 1 year even if not exposed in the UI. You may want to bring it back later as a premium feature or for the keepsake book product (V2). Deleting audio is irreversible.

### Recommendation
Keep audio for paying subscribers (forever). Delete audio for expired trials after 90 days. Don't sacrifice the voice differentiator — it costs almost nothing and is your strongest moat.

---

## 4. What Changes at Each Scale Tier

### At 1K Users — No Infrastructure Changes Needed
- Supabase Pro handles this comfortably
- Audio storage well within included 100GB
- PostHog free tier handles analytics volume
- RevenueCat free tier covers billing (< $2.5K MTR)
- **Your job:** Focus on product, not infrastructure

### At 10K Users — Monitor and Tune
- **Database performance** — Supabase Pro includes connection pooling (PgBouncer), but monitor query performance. Add indexes on:
  - `entries.user_id` (already needed for RLS)
  - `entries.child_id`
  - `entries.created_at`
  - Full-text search index on `entries.transcript`
  - `entries.user_id, entries.created_at` (compound index for per-user timeline queries)
- **Audio storage** — approaching or exceeding Supabase Pro's included 100GB. Budget ~$15/mo for overage.
- **Edge Function cold starts** — if tagging pipeline latency is noticeable, investigate warm-up strategies or move tagging to async (tag after save, not during).
- **Supabase plan** — may need to upgrade from Pro ($25) to Team ($599) depending on compute needs. Monitor before upgrading.

### At 50K Users — Professionalize
- **Dedicated database compute** — Supabase offers compute add-ons. If query latency increases, add a larger compute instance before migrating away from Supabase.
- **CDN** — Supabase Storage already serves via CDN, but verify audio playback latency for users in different regions.
- **Rate limiting** — add rate limiting on Edge Functions and API endpoints to prevent abuse. Supabase supports this natively.
- **Monitoring** — move beyond Supabase dashboard:
  - **Sentry** — error tracking in the app and edge functions ($0 for 5K errors/mo)
  - **Uptime monitoring** — BetterStack or UptimeRobot (free tiers available)
  - **Alerts** — set up Slack/email alerts for error spikes, high latency, storage thresholds

### At 100K Users — Evaluate Architecture
- **Database** — Supabase enterprise plan or evaluate dedicated Postgres (Neon, RDS, etc.)
- **Audio transcoding** — if Android is launched, may need server-side transcoding for format consistency across platforms
- **Background jobs** — if tagging, wrap-ups, and other async processing grows complex, consider a proper job queue (Supabase Edge Functions may not be ideal for long-running tasks at this scale)
- **Caching** — consider caching frequently accessed data (home screen entries, child profiles) to reduce database load
- **Read replicas** — if database reads become a bottleneck, Supabase supports read replicas on higher plans

---

## 5. Stay on Supabase or Migrate?

**Short answer: Stay on Supabase as long as possible.**

Supabase can realistically carry you to 50K-100K users. The economics are good ($25-300/mo) and the managed infrastructure saves you from needing DevOps expertise. The value of Supabase isn't just the database — it's auth, storage, RLS, edge functions, and real-time all in one SDK with one dashboard.

**When to consider migrating:**
- When Supabase costs exceed what equivalent raw infrastructure would cost AND you have engineering help to manage it
- When you need capabilities Supabase doesn't offer (complex background job processing, multi-region, etc.)
- When Edge Functions become a bottleneck for complex server-side logic

**Migration cost is real:** Rewriting auth, storage, RLS, and API layers is weeks of engineering work. Don't do it for cost savings alone — do it when capabilities are the bottleneck.

---

## 6. Architectural Decisions to Bake In Now

These are zero-effort decisions during development that prevent expensive rework at scale. See also: Product Spec Section 10.1.

1. **Separate dev/prod Supabase projects from day one** — never test against production data. Create two Supabase projects: `littlelegacy-dev` and `littlelegacy-prod`.
2. **Use environment variables for all service URLs/keys** — never hardcode Supabase URL, PostHog key, RevenueCat API key, etc. Use Expo's `.env` support.
3. **Abstract storage calls behind a service layer** — if you ever move from Supabase Storage to raw S3, you change one file, not fifty.
4. **Add database indexes on columns you query frequently** — user_id, child_id, created_at, full-text search column. Cheap to add now, painful to discover you need at 10K users.
5. **Use Supabase Row Level Security (RLS) from the start** — trivial to set up during table creation, painful to retrofit. Every table should have RLS policies before the first row is inserted.
6. **Version your database schema with migrations** — Supabase supports this natively via the CLI. Don't make schema changes by clicking in the dashboard.
7. **Log PostHog analytics events as you build each feature** — don't plan an "add analytics" sprint later. Drop the event call in as you write the feature code.

---

## 7. Scaling Checkpoints

### At 100 Users — Validate
- Are people actually recording entries after week 1?
- What's the voice vs. text ratio? (validates your core thesis)
- What are the top 3 complaints?
- Is onboarding actually < 90 seconds?
- Are Edge Functions responding within acceptable latency?

### At 1,000 Users — Optimize
- Trial-to-paid conversion: is it above 30%?
- Check Supabase dashboard: database size, storage used, function invocations
- Audio storage growth tracking as expected?
- Notification tap-through rate?
- Any slow queries appearing in Supabase logs?

### At 10,000 Users — Professionalize
- Infrastructure: review database performance, add indexes if needed, check edge function latency
- Storage: approaching 100GB included limit?
- Error tracking: Sentry integrated?
- Uptime monitoring: set up alerts?
- Consider: Android launch to double addressable market

### At 100,000 Users — This Is a Real Business
- Supabase plan review (enterprise?)
- Audio storage: ~2TB+ cumulative. Verify costs.
- Database: read replicas or compute upgrades needed?
- Background processing: edge functions still sufficient or need job queue?
- CDN: audio playback latency acceptable in all markets?
