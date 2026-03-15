# Forever Fireflies — Business Operations & Legal Guide

Everything outside of code and marketing that goes into running a consumer app as a business: legal compliance, business formation, financial planning, App Store presence, customer support, and team growth.

---

## 1. Legal & Compliance

### Launch Blockers (Cannot Submit to App Store Without These)

**Privacy Policy**
- Required by Apple, Google, and most jurisdictions (GDPR, CCPA, etc.)
- Must disclose: what data you collect (names, voice recordings, child info), how you store it, which third parties process it (Supabase, RevenueCat, PostHog, and eventually Anthropic), and user rights (deletion, export)
- **Recommended tools:**
  - **Termly** ($10/mo) — generates privacy policy, terms of service, cookie consent, and COPPA compliance docs. Dashboard keeps everything updated when laws change.
  - **iubenda** ($27/yr) — similar generator, slightly cheaper but less guidance. Good for straightforward apps.
- Either tool takes ~30 minutes: answer questions about your app, it generates the documents. Don't write these from scratch — you'll miss required disclosures.
- Must be hosted at a public URL (your Framer landing page).

**Terms of Service**
- Covers: user relationship, content ownership (parents own their memories — make this explicit), your liability limits, subscription terms, account termination policy
- Same generators (Termly/iubenda) create these alongside your privacy policy.

**Apple Developer Account** ($99/year)
- Register as an **individual** for now (your legal name shows as the seller on the App Store). You can switch to an organization (LLC) later.
- Apply early — approval can take a few days, sometimes longer.
- You do NOT need an LLC to get an Apple Developer account.

**App Store Privacy Declarations**
- When you submit, Apple asks you to declare exactly what data you collect and why.
- Categories you'll declare:
  - **Contact Info** — email (for auth)
  - **Name** — child names (app functionality)
  - **Audio Data** — voice recordings (app functionality)
  - **Usage Data** — analytics via PostHog (analytics)
- Must answer this accurately. Misrepresenting will get you rejected or pulled from the store.

### COPPA — The Key Legal Question for This App

**What COPPA is:** The Children's Online Privacy Protection Act makes it illegal to collect personal information from children under 13 without verifiable parental consent.

**Your situation:** Your app collects data *about* children (names, ages, stories about them) but the *user* is always the parent. The child never uses the app.

**The good news:** Most legal interpretations say COPPA applies when the *user* is a child. Since your users are parents (adults), and children never interact with the app, you're likely in the clear. Apps like Huckleberry and Baby Tracker operate this way.

**The risk:** If the FTC decided that storing a child's name + age + stories constitutes "collecting personal information about a child," there's exposure. Fines up to $50K per violation.

**What to do:**
1. **Before launch:** Self-assessment. Read the FTC's COPPA FAQ (ftc.gov — it's surprisingly readable). Document your reasoning for why COPPA doesn't apply.
2. **Do NOT list in the "Kids" category on the App Store** — that triggers stricter compliance requirements. List under "Lifestyle."
3. **Don't send child data to third parties unnecessarily.** Product spec already says "only entry text sent to AI provider, no child names" — maintain this principle.
4. **Before 1K users:** Get a one-time legal opinion from a startup attorney. Many will do a focused COPPA letter for $500-1,000. Worth it for peace of mind.

### Business Formation

**LLC (Limited Liability Company)**
- Protects your personal assets if someone sues (unlikely, but insurance against catastrophe)
- Costs $50-500 depending on state. Your home state is simplest.
- **When:** Before you start collecting revenue. You can launch on the App Store as an individual first, but form the LLC before money flows.
- Wyoming and Delaware are popular for low fees and privacy, but filing in your home state avoids the complexity of registering as a "foreign LLC" in your state of residence.

**Business Bank Account**
- Open once you have the LLC. Keep app money separate from personal.
- Most banks offer free business checking: Mercury, Relay, or your local bank.
- Apple pays developer proceeds monthly, ~45 days after the end of each fiscal month.

**Trademark**
- Search USPTO (free, 10 minutes) for "Forever Fireflies" before you get too attached. A conflict could force an expensive rebrand.
- Filing costs $250-350 if you DIY through USPTO's TEAS system. Takes 8-12 months for approval.
- **Do the search now (free). File when revenue supports it.**
- Note: app name isn't finalized yet, so search your top candidates.

### At Scale

**GDPR** (if any EU users)
- Requires: consent for data collection, right to deletion, right to data export, data processing agreements with vendors
- Supabase, PostHog, and RevenueCat all offer GDPR-compliant configurations
- Not urgent for a US-first launch — but bake in the ability to delete a user's data completely (Supabase RLS + cascade deletes make this straightforward)

**CCPA** (California users)
- Triggered at 50K+ users or $25M+ revenue
- Similar to GDPR: right to know, right to delete, right to opt out of data sale
- You won't sell data, so most requirements are about disclosure and deletion

**Startup attorney on retainer** — once revenue justifies it (~$500-1K/quarter for occasional questions)

**Cyber liability insurance** ($500-1,500/year) — covers you if there's a data breach. Consider when user count hits 10K+.

---

## 2. Financial Planning

### The Bootstrapper's Financial Picture

Key question: **at what point can this replace a salary?**

### Monthly Operating Costs at Launch

| Item | Cost |
|------|------|
| Supabase Pro | $25/mo |
| Apple Developer | $8.25/mo ($99/yr) |
| Domain | ~$1/mo ($12/yr) — when name is locked |
| RevenueCat | Free (< $2.5K MTR) |
| PostHog | Free (< 1M events) |
| Expo EAS | Free tier |
| Website hosting (Framer) | Free tier |
| Privacy policy (Termly) | $10/mo |
| Email (Google Workspace) | $7/mo |
| Email marketing tool | $0-49/mo (free tier covers early phase — see marketing-plan.md) |
| **Total** | **~$55-104/mo** |

### Revenue Math

**Apple's cut:**
- Apple takes 30% of all in-app purchases by default
- **Apple Small Business Program:** If you earn < $1M/year (you will for a long time), you qualify for the **15% rate**. You must apply — it's not automatic. Do this before your first sale.
- **Net per $5.99/mo subscriber:** $5.09/mo (at 15% Apple cut)
- **Net per $49.99/yr subscriber:** $42.49/yr = $3.54/mo (at 15% Apple cut)
- Annual subscribers give you less per month but much lower churn. Most successful apps see 60-70% of revenue from annual plans.
- **Price testing:** Launch at $5.99/$49.99, then use RevenueCat Experiments to A/B test $4.99 and $6.99 monthly variants once there's enough traffic. You can always lower a price; raising it after launch is much harder.

**Conversion funnel reality:**
Industry benchmarks for subscription apps:
- Download → Trial start: 30-50%
- Trial → Paid: 20-40% (your locked-memories paywall should push toward 40%)
- **Effective download → paid: ~10-20%**

For every 100 downloads, expect 10-20 paying subscribers.

### Path to Full-Time — Scenario Modeling

| Milestone | Paying Subs | Monthly Net Revenue | Annual Net Revenue | Enough to... |
|-----------|-------------|--------------------|--------------------|---------------|
| Break even | 13 | $66 | $795 | Cover infrastructure |
| Ramen profitable | 120 | $611 | $7,330 | Buy groceries |
| Side income | 300 | $1,527 | $18,330 | Meaningful side income |
| **Part-time viable** | **600** | **$3,055** | **$36,660** | Reduce day job hours |
| **Full-time threshold** | **1,000** | **$5,090** | **$61,080** | Replace modest salary |
| Comfortable | 3,000 | $15,270 | $183,240 | Hire help, invest in growth |
| Real business | 6,000 | $30,540 | $366,480 | Small team, serious growth |

**Key insight:** At $5.99/mo, you need ~1,000 paying subscribers to go full-time at a modest salary. At 15% download-to-paid conversion, that's ~6,700 total downloads needed. Over 12 months = ~560 downloads/month — very achievable with strong ASO + organic channels.

### Hidden Costs to Budget For

| Item | When | Cost |
|------|------|------|
| COPPA legal opinion | Before launch or soon after | $500-1,000 (one-time) |
| LLC formation | Before revenue | $50-500 (one-time) |
| Trademark search + filing | When name is confirmed | $275-400 (one-time) |
| Test devices | During development | $0 if you have an iPhone |
| App Store screenshots (Rotato) | Before launch | $0-49 (one-time) |
| Accounting software (Wave) | When revenue starts | $0 (Wave is free) |
| Tax prep (Schedule C or LLC return) | Annual | $200-500/yr |
| Apple Search Ads (when ready) | Month 4+ | $150-300/mo starting budget |

**Total pre-launch investment: ~$300-600 one-time + ~$55/mo ongoing.** Extremely lean.

### The "Go Full-Time" Decision Framework

Don't quit your day job at 1,000 subscribers. Safer framework:
1. **Revenue covers costs + has been growing for 3 consecutive months** — proves it's not a fluke
2. **You have 6 months of personal expenses saved** — safety net
3. **Monthly churn is below 5%** — proves retention, not just acquisition
4. **You can clearly see the path from current revenue to salary replacement** — the growth curve, not just the current number

### Taxes

- App revenue is self-employment income. You'll owe income tax + self-employment tax (~15.3%).
- As an LLC, deduct business expenses: Supabase, Apple fees, domain, home office, etc.
- **Set aside 25-30% of net revenue for taxes from day one.** Put it in a separate savings account.
- Use accounting software (Wave is free) to track expenses from the start.
- File quarterly estimated taxes once revenue is meaningful (IRS Form 1040-ES).

### Apple Small Business Program — Don't Forget

Apply before your first sale. Reduces Apple's cut from 30% to 15% for developers earning under $1M/year. That's an extra $0.90 per subscriber per month at $5.99. Simple application in App Store Connect.

---

## 3. Website / Landing Page

### The Plan
- **Tool:** Framer (no-code, free tier)
- **Purpose:** Marketing page + legal docs. NOT a web app, NOT a user dashboard.
- **Domain:** Not locked yet since app name isn't finalized. Grab the domain once the name is decided.

### Apple requires two URLs before you can submit:
1. **Support URL** — can be a "Contact Us" section on your landing page with a support email link
2. **Privacy Policy URL** — hosted on your landing page (Termly/iubenda embed or dedicated page)

### What the Landing Page Needs
- Hero section: emotional tagline + phone mockup + App Store download button
- "How it works": 3-step visual (Record → Organize → Relive)
- Emotional hook: "Imagine your grandchild hearing your voice describe their first steps"
- FAQ section (accordion on the same page — not a separate page)
- Privacy Policy page
- Terms of Service page
- Contact/support: mailto: link to support email
- Footer with links to legal pages and social accounts

### What You Can Skip at Launch
- Blog (add later for SEO if needed)
- Press kit (add when someone asks)
- Testimonials (add once you have real users)
- Account management / web login

---

## 4. App Store Presence

### Before Launch
- **App name** — 30 chars max. Check it's not taken on the App Store.
- **Subtitle** — 30 chars. Your #1 keyword opportunity. See Marketing-Plan.md for keyword research.
- **Description** — 4,000 chars max. First 3 lines are visible before "more" tap — make them count.
- **Keywords** — 100 chars, comma-separated, hidden from users. See Marketing-Plan.md.
- **Screenshots** — 6.7" and 6.5" sizes required. Show emotional moments: filled memory book, recording screen, entry detail view. Tools: Rotato ($0-49), Screenshots.pro, or Figma mockups.
- **Preview video** (optional but high-impact) — 15-30 second screen recording of record → transcribe → browse flow.
- **Category** — "Lifestyle" primary. Avoid "Kids" category (triggers stricter compliance).
- **Age rating** — declare data collection practices accurately.

### Ongoing
- **Respond to all reviews** — every 1-star review is a chance to save a user and show others you care.
- **A/B test screenshots** — Apple supports product page optimization (up to 3 variants).
- **Update cadence** — regular updates signal an active app to Apple's algorithm and users.

---

## 5. Customer Support

### At Launch (Solo)
- **Support email** — support@[yourdomain].com. Route to your personal inbox initially.
- **In-app feedback** — "Contact Us" in Settings opens email compose with device info + app version auto-attached. (See PRD V1.5 roadmap)
- **FAQ on landing page** — answer the top 10 questions before anyone asks:
  1. Is my data private?
  2. Can I export my memories?
  3. What happens if I cancel my subscription?
  4. Does it work offline?
  5. Can both parents use it?
  6. How do I delete my account?
  7. What audio quality is used?
  8. Is there a free trial?
  9. What devices are supported?
  10. How do I contact support?

### At 1K+ Users
- **Canned responses** — draft template replies for the top 10 recurring questions
- **Bug report workflow** — standardize triage using GitHub Issues

### At 10K+ Users
- **Help center** — move FAQ to a searchable knowledge base (Notion public page, GitBook, or Intercom)
- **Part-time support contractor** — VA or contractor for routine support ($500-1K/mo)
- **In-app help** — contextual tooltips and onboarding improvements to reduce support volume

---

## 6. Analytics & Metrics

### Track These From Day One (PostHog)

**Funnel Metrics:**
1. App Store impression → Download (App Store provides this)
2. Download → Onboarding complete (first child + first entry)
3. Onboarding → Day 7 return
4. Day 7 → Trial end
5. Trial end → Paid conversion

**Engagement Metrics:**
- Entries per user per week
- Voice vs. text entry ratio (validates your core thesis)
- Average recording duration
- Search usage frequency
- Notification tap-through rate

**Revenue Metrics:**
- Monthly Recurring Revenue (MRR)
- Average Revenue Per User (ARPU)
- Trial-to-paid conversion rate
- Monthly churn rate
- Lifetime Value (LTV)

### PostHog Events to Define During Development
Build these into your code as you write each feature — don't plan an "add analytics" sprint:
- `onboarding_started`, `onboarding_completed`
- `entry_recorded` (properties: type=voice/text, duration, child_id)
- `entry_viewed`, `entry_searched`
- `notification_tapped`
- `trial_started`, `trial_expired`, `subscription_started`, `subscription_cancelled`
- `child_added`, `child_profile_updated`
- `feedback_submitted` (V1.5)

---

## 7. Team & Hiring

### Solo Phase (0 → 5K users)
You're doing everything. This is normal for an indie app. Key: know what to outsource vs. learn yourself.
- **Outsource:** Legal docs (Termly), accounting (Wave), complex design work (Fiverr/Upwork for App Store assets)
- **Learn enough:** Marketing basics (ASO), App Store submission process, analytics interpretation

### First Contractors (5K → 50K users)
When your time becomes the bottleneck:
1. **Part-time customer support** ($500-1K/mo) — first thing to offload. Your time is better spent on product.
2. **Freelance designer** — for marketing materials, App Store screenshots, social content. Project-based.
3. **Marketing contractor** — someone who understands ASO and social media for consumer apps. Could be informal (sister-in-law) or formal.

### Real Team (50K → 100K+ users)
At ~$305K/year revenue, you can afford to hire. Prioritize in this order:

1. **Backend / Growth Engineer** (first hire)
   - Handles: infrastructure scaling, Android port, performance optimization, growth features (referral system, sharing, notifications V2)
   - Why first: frees you to focus on product direction, user research, and business decisions instead of fighting fires
   - Budget: $80-120K/yr for full-time, or $50-80/hr for a strong contractor

2. **Part-time Customer Support** (second hire)
   - Handles: daily support emails, App Store review responses, FAQ maintenance
   - Why second: support volume scales linearly with users — at 100K users you'll get 20-50+ emails/week
   - Budget: $1-2K/mo for a VA or contractor

3. **Marketing / Growth Person** (third hire)
   - Handles: ad campaign management, ASO optimization, content creation, influencer outreach
   - Why third: until you have engineering help and support covered, you can't capitalize on growth anyway
   - Budget: $3-5K/mo contractor or part-time
   - Note: your sister-in-law with EA agency experience could be a great fit here if she's interested

---

## 8. Pre-Launch Checklist

### Business Setup
- [ ] Search USPTO for app name (free, 10 minutes)
- [ ] Form LLC (before revenue starts)
- [ ] Open business bank account
- [ ] Apple Developer account created ($99/year)
- [ ] Apple Small Business Program applied for (before first sale)

### Legal Documents
- [ ] Privacy Policy generated (Termly or iubenda) and published on website
- [ ] Terms of Service generated and published on website
- [ ] COPPA self-assessment documented
- [ ] App Store privacy declarations prepared

### Website
- [ ] Landing page live on Framer (once domain is locked)
- [ ] Support email set up
- [ ] FAQ section on landing page

### App Store
- [ ] App Store listing prepared (name, subtitle, description, keywords)
- [ ] Screenshots created (6.7" and 6.5" sizes)
- [ ] Preview video (optional but recommended)
- [ ] Category: Lifestyle (NOT Kids)

### Infrastructure
- [ ] Supabase prod project separate from dev
- [ ] PostHog analytics events integrated
- [ ] RevenueCat configured with trial + subscription products
- [ ] TestFlight beta tested with 10+ real parents

### Email Marketing
- [ ] Email marketing tool selected and account created (see marketing-plan.md — Email Strategy for options)
- [ ] Waitlist auto-responder configured on coming-soon page
- [ ] Welcome email series (5 emails) written and loaded
- [ ] Trial-ending and win-back emails written and loaded
- [ ] CAN-SPAM compliance: unsubscribe link + physical address in every email footer
- [ ] Test all email sequences with a personal account before launch

### Financial
- [ ] Accounting software set up (Wave — free)
- [ ] Tax reserve savings account opened (25-30% of revenue)

---

## Key Vendor References

| Need | Vendor | Cost | Notes |
|------|--------|------|-------|
| Privacy Policy / ToS | **Termly** | $10/mo | Dashboard, auto-updates for law changes |
| Privacy Policy / ToS (alt) | **iubenda** | $27/yr | Cheaper, less guidance |
| Accounting | **Wave** | Free | Invoice, expense tracking, receipt scanning |
| Business bank | **Mercury** or **Relay** | Free | Online-first, startup-friendly |
| LLC formation | Your state's Secretary of State | $50-500 | Or use LegalZoom/Incfile for guidance ($100-300) |
| App Store assets | **Rotato** | $0-49 | 3D device mockups for screenshots |
| Trademark search | **USPTO TESS** | Free | Search before you commit to a name |
| Trademark filing | **USPTO TEAS** | $250-350 | DIY filing when name is locked |
| Email marketing | **TBD** (Loops, Resend, Kit, or Buttondown) | Free–$49/mo | Welcome series, lifecycle emails, event-triggered flows. See marketing-plan.md for comparison |
| Error tracking | **Sentry** | Free (5K errors/mo) | Add at 10K+ users |
| Uptime monitoring | **BetterStack** / **UptimeRobot** | Free tier | Add at 10K+ users |
