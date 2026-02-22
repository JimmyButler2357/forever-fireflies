# LittleLegacy — Marketing Plan

Step-by-step marketing playbook for a bootstrapped consumer app launch. Organized by phase, with tactics that cost $0 first and paid channels only when organic signals justify the spend.

---

## Your Unfair Advantages

Before tactics, acknowledge what you have that most indie devs don't:

1. **Sister-in-law with EA marketing agency experience** — even casual conversations about positioning, messaging, and channels are worth more than any blog post. Key question to ask her: "If you were launching a $3/mo subscription app to moms of toddlers, where would you spend your first $0? Your first $500?"

2. **Wife and sister in the target demographic** — they ARE your user research panel. Have them use the app from TestFlight day one. Watch them onboard (don't help). Listen to what confuses them, what delights them, what they'd tell a friend. Their honest reactions are worth more than 1,000 survey responses.

3. **Their networks** — your wife's mom friends group chat, your sister's social circle — these are warm introduction channels. One genuine recommendation from a real mom in a group chat drives more downloads than a Reddit post.

---

## Phase 0: While You're Still Building (Now → Launch)

Zero cost. Zero distraction from coding. Just planting seeds.

- [ ] Create an Instagram account (@littlelegacy or similar) — post occasional behind-the-scenes: screenshot of your mockup, "building something for parents who don't want to forget the little things." Don't overthink it — 1 post every 1-2 weeks.
- [ ] Put up a "coming soon" landing page — one paragraph, an email capture form ("Get notified when we launch"), your emotional tagline. Use Framer ($0 on free tier).
- [ ] Ask your sister-in-law for a 30-minute marketing chat — show her the mockup, explain the concept, ask for her gut reactions on positioning and channels. Take notes.
- [ ] Have wife + sister review the HTML mockup — ask "would you use this? what would you tell a friend about it?"

---

## Phase 1: Beta / TestFlight (2-4 weeks before launch)

Still zero ad spend. Getting real humans using the real app.

- [ ] Invite 15-25 real parents to TestFlight — prioritize: wife, sister, their mom friends, your parent friends, and anyone from the waitlist email
- [ ] Watch 3-5 of them onboard — screen share or sit next to them. Don't help. Note every hesitation. This is the most valuable 30 minutes you'll spend.
- [ ] Ask each beta tester: "Would you pay $3/month for this?" and "Who would you tell about this?" — their answers tell you if you have product-market fit.
- [ ] Fix the top 3 friction points before public launch.

---

## Phase 2: Launch Week

Still $0 ad spend. Organic push across every channel you can reach.

### Personal Outreach
- Text/DM every parent you know. Not a mass blast — personalized messages.
- "Hey, I built this app for parents to save voice memories of their kids. Would love for you to try it."
- Your wife and sister posting "my [husband/brother] built this and I actually love it" in their group chats is far more credible than you posting.

### Reddit (High-Value, Tricky to Get Right)
- **Target subreddits:** r/Mommit (1.2M members), r/Parenting (5M+), r/toddlers, r/daddit, r/NewParents
- **Do NOT post an ad.** Post a genuine story: "I'm a dad/developer who realized I was forgetting my kid's best moments. So I built an app that lets you speak a memory in 60 seconds and it saves the audio forever. Just launched — would love feedback from real parents."
- Engage with every comment. Be a human, not a brand.
- One post per subreddit, spread across the first 2 weeks. Don't spam.

### Facebook Parenting Groups
- Same authentic approach as Reddit.
- Your wife or sister posting is more credible than you posting directly.
- Search for groups: "moms of toddlers [your city]", "new moms support group", "parenting tips and tricks"

### Product Hunt
- Good for credibility with the tech crowd, less relevant for your target demographic.
- Worth 1 hour to submit. Don't expect a flood of mom users from here.

### Hacker News
- "Show HN" post if the technical story is interesting (voice-first, on-device transcription, indie Supabase architecture).
- Developer community appreciates indie launches.

---

## Phase 3: First 3 Months — Organic Growth

Minimal spend. Focus: get to 100-500 users and validate retention before spending money.

### App Store Optimization (ASO) — Your Highest-Leverage Ongoing Activity

**What is ASO?** It's SEO for the App Store. You're optimizing what shows up when parents search for apps, so your app appears higher in results.

**The three text fields that matter:**

| Field | Length | Visibility | Purpose |
|-------|--------|------------|---------|
| **Title** | 30 chars | Shown in search results | App name. E.g., "LittleLegacy" |
| **Subtitle** | 30 chars | Shown below title in results | Your #1 keyword opportunity. E.g., "Voice Memory Journal for Parents" |
| **Keyword field** | 100 chars | Hidden from users | Comma-separated search terms Apple uses for ranking |

**How to research keywords:**
1. Search the App Store yourself — type "baby journal" and see what auto-completes. Those are real searches.
2. Look at competitor listings — what keywords do Day One, Huckleberry, Baby Tracker use in their titles/subtitles?
3. Free tools: **AppFollow** (free tier), **App Store Connect analytics** (shows which search terms lead to your app page)
4. Paid tools (when revenue justifies): **AppTweak**, **Sensor Tower** — show search volume for specific terms

**Target keywords for LittleLegacy:**
- High intent: "baby journal", "memory book app", "baby memory"
- Medium intent: "parenting journal", "voice journal", "baby milestones"
- Long tail: "toddler memory book", "childhood journal app", "voice diary for parents"

**Your subtitle should contain your highest-volume keyword.** Test options like:
- "Voice Memory Journal for Parents" (26 chars)
- "Baby Journal & Voice Memories" (29 chars)
- "Voice Baby Journal & Memories" (29 chars)

**Your keyword field** should contain terms NOT already in your title/subtitle (Apple counts those automatically). Example:
`baby,toddler,milestone,diary,record,audio,motherhood,parenting,keepsake,scrapbook,family`

### App Store Reviews
- Prompt happy users for reviews in-app after they've recorded 10+ entries (not before — early prompts annoy people).
- 5-star reviews compound over time and boost search ranking significantly.
- Respond to every review (especially negative ones) — shows you care and signals an active developer.

### Micro-Influencer Outreach
- Find 5-10 parenting creators on Instagram/TikTok with 5K-50K followers.
- DM them: "I built a voice memory journal for parents — would love to gift you a free year if you'd try it with your kids."
- Many will say yes. If even one posts about it, that's hundreds of highly-targeted eyeballs.
- Cost: $0 (a gifted year subscription costs you nothing in marginal cost).

### Content Marketing (Optional — SEO Play)
If you add a blog to your website, write 3-5 posts targeting search terms parents Google:
- "how to remember childhood moments"
- "baby journal ideas for busy moms"
- "best way to preserve toddler milestones"
- "voice journal app for parents"

These take months to rank in Google but compound over time. Low priority vs. ASO.

---

## Phase 4: Months 4-8 — Deliberate Growth

**Only spend money if organic signals are positive:** retention > 50% at day 30, trial-to-paid > 25%.

### Apple Search Ads
- Start with $5-10/day targeting "baby journal", "memory app" keywords.
- Apple Search Ads have the best ROI for subscription apps because the user is already in the App Store looking for something.
- **Key metric:** Cost Per Acquisition (CPA). If CPA < $5 and a subscriber pays $30/year net, payback is under 2 months.
- Start with "Search Match" (Apple auto-matches to relevant searches) to discover which terms convert, then shift budget to exact match on top performers.

### Instagram / Facebook Ads
- Emotional video ad showing: parent tapping record → speaking a sweet memory → seeing it organized in the app. 15-30 seconds.
- Target: parents of children ages 0-5, interests in parenting/baby apps.
- Start at $10/day. Kill it immediately if CPA is above your payback threshold.
- **Ask your sister-in-law for help here** — she'll know how to structure ad creative and targeting for Meta platforms. This is literally what agencies do.

### Referral Program (Built Into App — See PRD V2 Roadmap)
- "Invite a parent friend, you both get a free month."
- Built into Settings. User taps "Invite a Friend" → generates a share link → friend downloads and subscribes → both get credited.
- Cost per referral: ~$2.55 of lost revenue — far cheaper than paid acquisition.

---

## Phase 5: Month 9+ — Scale What Works

By now you know which channels produce retained, paying users. Double down on those, cut the rest. Typical patterns for parenting apps:
- ASO + Apple Search Ads carry the bulk of acquisition
- Word-of-mouth (referral program + shared entries) provides the best quality users
- Instagram/Facebook ads work for awareness but require constant creative refresh

---

## The Viral Loop Already in Your Roadmap

Your V1.5 shared entry feature (share a memory via link → recipient sees LittleLegacy branding + "Capture your family's memories" CTA) is a built-in growth engine. Every shared memory is a free, highly-targeted ad to another parent. Consider prioritizing this feature if early users ask for sharing.

---

## Common Marketing Mistakes (Avoid These)

1. **Don't build a brand account and post into the void** — 3 followers seeing your polished Instagram post is a waste of time. Focus on going where parents already are (groups, communities, DMs).
2. **Don't spend money on ads before you know people retain** — ads just accelerate whatever's happening. If your app leaks users, ads leak money faster.
3. **Don't hire a marketing agency at this stage** — your sister-in-law's casual advice is worth more than a $2K/mo agency that doesn't understand your product.
4. **Don't try to be on every platform** — pick 2 channels (probably Reddit + Instagram or Reddit + direct outreach) and do them well.
5. **Don't compare yourself to VC-funded competitors** — they're spending $50K/month on ads. You're building organic traction. Different game, different timeline, but you keep your equity.

---

## Marketing Checklist by Phase

### While Building (Now)
- [ ] Create Instagram account
- [ ] Put up "coming soon" page with email capture (Framer)
- [ ] Have marketing chat with sister-in-law
- [ ] Have wife + sister review mockup

### Before TestFlight
- [ ] 15-25 beta testers identified
- [ ] Feedback script ready (what to ask testers)

### Launch Week
- [ ] Personal outreach to all parent contacts
- [ ] Reddit posts (1 per subreddit, authentic)
- [ ] Facebook group posts (wife/sister help here)
- [ ] Product Hunt submission
- [ ] Hacker News Show HN (if appropriate)

### First 3 Months
- [ ] ASO keywords researched and subtitle optimized
- [ ] App Store review prompt added (after 10+ entries)
- [ ] 5-10 micro-influencer DMs sent
- [ ] Respond to all App Store reviews

### Months 4-8 (If Retention Validates)
- [ ] Apple Search Ads campaign ($5-10/day)
- [ ] Instagram/Facebook test campaign ($10/day)
- [ ] Referral program launched (V2 feature)
