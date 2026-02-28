# Trial Length & Pricing Tier Analysis

> Core Memories — February 2026
> Current plan: 7-day trial → $5.99/mo or $49.99/yr

---

## Part 1: Free Trial Length (7 vs 14 vs 30 Days)

### Industry Benchmarks

| Trial Length | Median Conversion (RevenueCat, 10K+ apps) | Cancellation Rate |
|---|---|---|
| ≤ 4 days | ~30% | ~26% |
| 7 days | ~45% | ~35% |
| 14 days | ~44% | ~40% |
| 30 days | ~45% | ~51% |

Key finding: Once you get past 4 days, the conversion rate barely moves (~44-45% median across all lengths). **What happens during the trial matters far more than the length itself.**

### 7-Day Trial

#### Pros
- **Natural fit for a daily-use app.** Core Memories is designed around a nightly recording habit. 7 days = 7 chances to record, which is enough to build the beginnings of a routine and accumulate content the parent doesn't want to lose.
- **Creates healthy urgency.** Shorter trials drive faster engagement — users explore features immediately rather than procrastinating. Research shows every 10-minute delay in time-to-first-value costs ~8% in conversion.
- **Lower cancellation rate (~35% vs 51% for 30-day).** Users who convert from shorter trials tend to be more committed.
- **Faster revenue feedback loop.** You learn within a week whether your onboarding is working, enabling rapid iteration during early launch.
- **Industry standard for journal/memory apps.** Qeepsake, Day One, and most competitors use 7-day trials. Users expect it.
- **Matches your monthly billing cycle.** A 7-day trial pairs naturally with a monthly subscription — the user decides within a week, then their first month starts immediately.

#### Cons
- **May not be enough to form a real habit.** Research suggests habit formation takes 18-66 days. A parent who records 3 of 7 nights may not feel "hooked" yet.
- **Less content lock-in.** With only ~3-7 entries, the switching cost of walking away is low. The emotional weight of the content isn't overwhelming yet.
- **Misses "On This Day" magic.** The most emotionally powerful feature (memory resurfacing) can't fire in 7 days. The user never experiences the full emotional loop.

### 14-Day Trial

#### Pros
- **Doubles the content library.** ~7-14 entries creates a meaningfully richer collection. Scrolling through two weeks of memories starts to feel like a real journal.
- **Better habit formation window.** Two weeks is enough for a bedtime recording routine to start feeling natural.
- **Conversion rate is nearly identical to 7-day** (~44% vs ~45%), so you're not sacrificing conversion.
- **More forgiving for busy parents.** If a parent misses a few nights (inevitable with young kids), they still have time to come back and build momentum.
- **Better for annual plan conversion.** Longer trials pair better with annual subscriptions — the user has more invested and is more likely to commit to a year.

#### Cons
- **Slightly higher cancellation rate** than 7-day (~40% vs ~35%).
- **Slower revenue feedback.** Takes twice as long to learn if your trial-to-paid funnel is working.
- **More time for users to "see enough" and leave.** Some users may feel they've captured the memories they wanted and don't need to continue.

### 30-Day Trial

#### Pros
- **Maximum content lock-in.** 20-30 entries with audio recordings creates enormous emotional switching cost. Walking away means abandoning a month of your child's voice.
- **Full habit formation.** A month is enough to make the nightly recording genuinely automatic.
- **Highest raw acquisition.** 30-day trials attract the most signups (32% of users will try a 30-day trial vs 22% for 7-day).

#### Cons
- **Highest cancellation rate (51%).** Half of users who start a 30-day trial cancel before converting.
- **Procrastination effect.** With a month ahead, users delay engaging. "I'll try it this weekend" turns into forgetting entirely.
- **Terrible for early-stage economics.** You're giving away a full month of server costs (audio storage, transcription) before seeing any revenue. At your $5.99 price point, this matters.
- **Creates an expectation of "free."** Users who get 30 days free may feel the paywall is unfair — they've been using it for a month without paying.
- **No urgency to convert.** The trial-ending notification feels abrupt after a month of free access.
- **Overkill for your app's simplicity.** 30-day trials benefit complex B2B products where users need time to evaluate. Core Memories delivers value in 60 seconds (one recording). You don't need 30 days to prove that.

### Recommendation for Core Memories

**Start with 7 days. A/B test 14 days within the first 3 months via RevenueCat Experiments.**

Rationale:
1. Your app's "aha moment" is immediate — the first time a parent plays back their own voice describing their kid's day, they're hooked. That happens in the first session, not day 14.
2. 7 days gives enough time to accumulate 3-7 emotionally meaningful entries.
3. Your locked-entry design (entries visible but content paywalled after trial) means the content lock-in works even with fewer entries — parents can *see* what they'd lose.
4. Qeepsake uses 7 days. Matching the category norm reduces friction.
5. You can always extend a trial (via a "We miss you" push notification offering 7 more days) but you can't shorten one without upsetting users.

---

## Part 2: Intermediate Pricing Tiers (3-Month & 6-Month Plans)

### Current Plan
| Plan | Price | Per Month | Discount |
|---|---|---|---|
| Monthly | $5.99/mo | $5.99 | — |
| Annual | $49.99/yr | $4.17 | 30% off |

### Competitive Landscape

| App | Monthly | Annual | Per Month (Annual) | Other Tiers |
|---|---|---|---|---|
| **Qeepsake** | N/A | $40–$96/yr | $3.33–$8.00 | Annual only |
| **Day One** | $5.99 | $34.99 | $2.92 | — |
| **Journey** | N/A | $29.99 | $2.50 | — |
| **Rosebud** | $4.99 | — | — | — |
| **Voice Diary** | $1.49 | $8.99 | $0.75 | — |
| **Core Memories** | $5.99 | $49.99 | $4.17 | — |

Your $5.99/mo is right in line with Day One and at the upper-middle of the journal category. Your annual is above Day One ($49.99 vs $34.99) but below Qeepsake Premium ($90-96/yr). This positioning makes sense — you're a specialized, voice-first parenting journal with audio storage costs that general journals don't have.

### Option A: Add a 3-Month Plan

#### As a Genuine Mid-Tier

| Plan | Price | Per Month | Discount |
|---|---|---|---|
| Monthly | $5.99 | $5.99 | — |
| **3-Month** | **$14.99** | **$5.00** | **17% off** |
| Annual | $49.99 | $4.17 | 30% off |

**Pros:**
- Lower commitment barrier than annual — easier for skeptical parents to say "I'll try 3 months."
- Faster payback on acquisition costs than monthly.
- Aligns with parenting milestones (a season, a quarter of the school year).
- Can be positioned as "Try a season" — parents think in seasons/stages, not fiscal years.

**Cons:**
- Cannibalizes annual subscribers. If someone would have picked annual, a 3-month plan at a small discount gives them a cheaper off-ramp.
- More churn touchpoints — 4 renewal decisions per year instead of 1.
- Complicates the paywall UI. More options = more cognitive load = lower conversion (Hick's Law).

#### As a Decoy/Anchor (Advanced Strategy)

OctaZone (fitness app) added a 3-month plan priced *higher* than annual to make the annual look like an incredible deal, increasing LTV by 30%. Example:

| Plan | Price | Per Month |
|---|---|---|
| Monthly | $5.99 | $5.99 |
| **3-Month** | **$16.99** | **$5.66** |
| Annual | $49.99 | $4.17 |

The 3-month plan at $16.99 ($5.66/mo) makes the annual plan's $4.17/mo look like a no-brainer by comparison, nudging more users toward annual. You're not expecting anyone to actually buy the 3-month plan — it's a psychological anchor.

### Option B: Add a 6-Month Plan

| Plan | Price | Per Month | Discount |
|---|---|---|---|
| Monthly | $5.99 | $5.99 | — |
| **6-Month** | **$29.99** | **$5.00** | **17% off** |
| Annual | $49.99 | $4.17 | 30% off |

**Pros:**
- Feels like a natural "half-year" commitment. Parents might think "I'll try it for the summer" or "through the school year."
- Less scary than annual for new users, more committed than monthly.
- Still improves retention vs monthly — you get 6 months of lock-in per renewal.

**Cons:**
- Same cannibalization risk as 3-month — may pull users away from annual.
- 6-month billing cycles are unusual in mobile apps. Users may find it unfamiliar.
- Adds complexity to paywall and RevenueCat configuration.
- Your $5.99 → $5.00 savings is only $1/mo — may not feel meaningful enough to drive behavior change.

### Option C: Keep It Simple (Monthly + Annual Only)

**Pros:**
- Clean paywall with clear choice: "try it monthly" or "commit and save 30%."
- Industry standard — Qeepsake, Day One, and most competitors offer exactly two tiers.
- Easiest to A/B test (fewer variables).
- Binary choices convert better than 3+ options for impulse/emotional purchases (and your paywall appears right after the emotional high of saving the first memory).
- Maximum annual plan conversion — no escape hatch between monthly and annual.

**Cons:**
- Some users who would pay for 3 or 6 months may churn off monthly before reaching annual conversion.
- Less pricing flexibility for promotions and win-back campaigns.

### Recommendation for Core Memories

**Launch with Monthly + Annual only (Option C). Consider adding a 3-month decoy (Option A, anchor variant) after you have baseline conversion data.**

Rationale:

1. **Simplicity wins at launch.** You need clean data to understand your conversion funnel. Two plans gives you a clear signal: "what % pick monthly vs annual?" Adding a third plan muddies this.

2. **Your paywall timing is your superpower.** The paywall appears right after the first memory is saved — an emotional high point. At that moment, the parent is thinking "this is amazing, I need this" — not "hmm, let me calculate the per-month cost of a 6-month plan." Simpler = faster conversion at that moment.

3. **60-70% of converters pick monthly first, then ~25% upgrade to annual later.** This is an industry-wide pattern. Instead of adding mid-tier plans, focus on a compelling upgrade prompt at the 3-month mark: "You've saved 47 memories of Emma. Lock in your year for 30% off."

4. **The decoy strategy is powerful but premature.** You need at least 1,000 paywall impressions to run a meaningful A/B test. Add the 3-month anchor once you have the traffic to test it properly via RevenueCat Experiments.

5. **Save mid-tier pricing for win-back.** When a monthly subscriber cancels, offer "Come back for 3 months at $12.99" as a retention play. This is more effective than having the tier available to everyone all the time.

---

## Part 3: Summary Action Plan

| Phase | Trial | Pricing | When |
|---|---|---|---|
| **Launch** | 7-day free trial | Monthly ($5.99) + Annual ($49.99) | Day 1 |
| **Month 2-3** | A/B test 7 vs 14 days | Keep two-tier | After ~500 trial starts |
| **Month 4-6** | Lock in winning trial length | A/B test adding 3-month decoy ($16.99) | After ~1,000 paywall views |
| **Month 6+** | Test achievement-based trial extension | Test win-back offers with 3-month pricing | After baseline LTV data |

### Key Metrics to Track (RevenueCat + PostHog)
- **Trial start rate** — % of onboarded users who start trial
- **Trial-to-paid conversion rate** — target 40%+ (category median is 44-45%)
- **Monthly vs annual split** — target 40%+ annual selection at paywall
- **Day-30 retention by plan type** — annual should be 2-3x monthly
- **Revenue per paywall impression** — your north star pricing metric

---

## Sources

- [RevenueCat: State of Subscription Apps 2025](https://www.revenuecat.com/state-of-subscription-apps-2025/)
- [Phiture: How to Optimize Free Trial Length](https://phiture.com/mobilegrowthstack/the-subscription-stack-how-to-optimize-trial-length/)
- [Adapty: Trial Conversion Rates for In-App Subscriptions](https://adapty.io/blog/trial-conversion-rates-for-in-app-subscriptions/)
- [RevenueCat: Annual Subscriptions — Pros and Cons](https://www.revenuecat.com/blog/growth/annual-subscriptions-apps-pros-cons/)
- [Adapty: How to Price Mobile In-App Subscriptions](https://adapty.io/blog/how-to-price-mobile-in-app-subscriptions/)
- [Customer.io: How to Choose the Right Free Trial Length](https://customer.io/learn/product-led-growth/free-trial-length)
- [Ordway: 14 Days vs. 30 Days SaaS Free Trial Length](https://ordwaylabs.com/blog/saas-free-trial-length-conversion/)
- [Qeepsake Pricing](https://qeepsake.com/pricing/)
- [Day One Pricing](https://dayoneapp.com/pricing/)
- [Tinybeans Acquires Qeepsake (Nov 2025)](https://www.prnewswire.com/news-releases/tinybeans-acquires-qeepsake-creating-the-leading-privacy-first-family-memory-platform-302603273.html)
- [Business of Apps: Subscription Trial Benchmarks 2026](https://www.businessofapps.com/data/app-subscription-trial-benchmarks/)
