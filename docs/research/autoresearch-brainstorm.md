# Autoresearch Brainstorm: Forever Fireflies

## Context

Forever Fireflies is a voice-first memory journal app for parents of young children. Parents record 60-second voice entries about their kids' days. The app auto-transcribes, then runs an AI pipeline (Claude Haiku) that generates a title, cleans the transcript, and suggests tags. A secondary client-side pipeline does keyword-based child/tag detection via synonym matching.

The codebase has several clear autoresearch surfaces: an LLM prompt, a keyword-matching system with a hand-curated synonym map, a filler-word list, and a prompt bank for inspiring recordings. All are lightweight logic layers where the search space is large and individual experiments are fast.

---

## Candidate #1: AI System Prompt Optimization (process-entry)

**What gets edited:** The `systemPrompt` string in `supabase/functions/process-entry/index.ts` (lines 113-121) — the instructions sent to Claude Haiku for title generation, transcript cleanup, and tag suggestion.

**The metric:** Composite score (0-100) averaged across a test set, computed as:
- **Title quality** (40%): Binary rubric per entry — Is it ≤8 words? Does it use the child's name when mentioned? Is it warm/specific (not generic like "A Nice Day")? Does it capture the core memory? Score = (yes answers / 4) × 100.
- **Transcript fidelity** (30%): Levenshtein similarity between cleaned output and human-gold-standard cleaned transcript. Penalize any meaning changes (semantic drift detector: embed both, cosine similarity must be ≥0.95).
- **Tag accuracy** (30%): F1 score of suggested tags vs. human-labeled ground truth tags.

**The test set:** 20-30 real or realistic voice transcripts spanning:
- Single child vs. multi-child mentions
- Short (1 sentence) vs. long (60 seconds)
- Filler-heavy vs. clean speech
- Clear memory vs. rambling/unclear
- Each labeled with: ideal title, ideal cleaned transcript, correct tags (from the 17 system tags)

**Experiment duration:** ~15-20 seconds (one Haiku API call per test transcript + scoring). Full test set: ~8-10 minutes per experiment cycle.

**Expected yield:** ~50-70 experiments per 8-hour overnight run.

**Why this is a good autoresearch target:**
- The prompt is a single string — the classic autoresearch editable asset
- The search space is enormous (wording, ordering, examples, constraints, tone instructions)
- The metric is automatically computable with no human in the loop
- Improvements are composable — better title instructions don't degrade tag instructions
- This is exactly the "prompt engineering for document processing pipelines" pattern the community has validated

**Risks or blind spots:**
- Overfitting to the test set — 20-30 examples may not cover edge cases (non-English names, twins, ambiguous memories)
- Title "warmth" is partially subjective — binary rubric approximates but doesn't fully capture it
- The prompt interacts with itself (title + cleanup + tags in one pass) — optimizing one output could degrade another. The composite metric partially addresses this but the weights (40/30/30) are arbitrary
- Cost: ~$0.10-0.15/experiment at Haiku rates → $5-10 per overnight run

---

## Candidate #2: Tag Synonym Map Expansion

**What gets edited:** The `TAG_SYNONYMS` map in `lib/autoDetect.ts` (lines 88-97) — the hand-curated mapping from tag slugs to spoken-language synonyms used for client-side keyword detection.

**The metric:** F1 score of tag detection (precision × recall harmonic mean). Computed by running `detectTags()` against a labeled test corpus and comparing detected tag IDs to ground-truth tag IDs.
- Precision = correct detections / total detections (penalizes false positives like "funny" matching when context isn't humorous)
- Recall = correct detections / total ground-truth tags (penalizes missed tags)

**The test set:** 50+ transcript snippets, each labeled with the correct tag(s) from the 17 system tags. Should include:
- Transcripts where each of the 17 tags should match (at least 2-3 examples per tag)
- Negative examples where a keyword appears but the tag shouldn't apply (e.g., "I don't think it's funny" → humor should NOT match)
- Multi-tag transcripts

**Experiment duration:** Pure string matching, no API calls — runs in <1 second per transcript. Full test set: <2 seconds per experiment cycle.

**Expected yield:** ~1,000+ experiments per overnight run (limited by agent thinking time, not execution).

**Why this is a good autoresearch target:**
- Extremely fast experiment cycles (sub-second execution)
- Clear, unambiguous metric (F1 score)
- Large search space: 17 tags × unlimited synonym candidates
- Currently only 8 of 17 tags have synonyms — lots of room to expand (sports, school, health, birthday, holiday, family, friendship, creativity, nature, food, travel all have zero synonyms)
- Composable: adding synonyms for one tag doesn't affect others

**Risks or blind spots:**
- Current detection is context-free — "I don't think it's funny" still matches "humor." The synonym map can't fix this fundamental limitation; it can only make it worse by adding more false-positive-prone keywords
- Diminishing returns — the AI tagging in process-entry already provides smarter tags. This client-side detection is a fallback for when AI processing fails or hasn't run yet
- The test set must carefully handle negation and context or the metric will reward aggressive synonym expansion (high recall, low precision)

---

## Candidate #3: Daily Recording Prompt Optimization

**What gets edited:** The prompt bank text in `supabase/migrations/20260301000017_seed_default_prompts.sql` (25 prompts across 4 age brackets) — or more practically, a `prompts.jsonl` file that feeds into a scoring harness.

**The metric:** LLM-as-judge score (0-10) averaged across dimensions:
- **Specificity** (0-10): Does the prompt ask about a concrete, observable moment (not abstract feelings)?
- **Recordability** (0-10): Can this be answered in a 15-60 second voice recording?
- **Memory-worthiness** (0-10): Would the answer be something the parent would want to re-read in 5 years?
- **Distinctiveness** (0-10): How different is this from other prompts in the bank? (pairwise comparison)
- Composite = average of all four

**The test set:** The existing 25 prompts as baseline, plus a "golden set" of 10 human-rated prompts with known scores to calibrate the LLM judge. Real engagement data (recording completion rate per prompt) would be the ideal metric but requires production data that doesn't exist yet.

**Experiment duration:** ~30-60 seconds per experiment (LLM judge evaluates one prompt variant). Full bank evaluation: ~10-15 minutes.

**Expected yield:** ~30-45 experiments per overnight run.

**Why this is a good autoresearch target:**
- Large search space — infinite possible prompt phrasings
- The output directly affects user engagement (a better prompt → parent records a richer memory)
- Age-bracket constraints add structure (baby prompts must differ from preschool prompts)
- The {child_name} placeholder pattern creates a natural template structure for the agent to work within

**Risks or blind spots:**
- LLM-as-judge is a proxy metric, not real engagement data — a prompt that scores well on "specificity" might still bore real parents
- Without production data, there's no way to validate the judge's scores against reality
- Risk of "prompt homogenization" — the agent might converge on one style that scores well but lacks variety
- The metric requires human judgment to score, which violates the autoresearch principle — the LLM judge is a workaround but adds its own biases

---

## Candidate #4: Filler Word List Tuning

**What gets edited:** The `FILLER_WORDS` set in `lib/textQuality.ts` (lines 17-20) and the duplicate in `supabase/functions/process-entry/index.ts` (lines 78-81) — the list of words excluded when counting "meaningful" content.

**The metric:** Quality gate accuracy (%). Computed against a labeled corpus:
- True positive: transcript has enough content, gate passes it through
- True negative: transcript is garbage/noise, gate correctly rejects it
- False positive: garbage gets through (wastes an API call)
- False negative: real memory gets blocked (user loses their entry)

Accuracy = (TP + TN) / total. Weighted: false negatives cost 10x more than false positives (blocking a real memory is much worse than wasting $0.002).

**The test set:** 40+ transcripts labeled as "real memory" or "noise/garbage":
- Real: varied lengths, filler-heavy but meaningful, single-sentence memories
- Noise: pure filler ("um like yeah ok"), garbled speech-to-text output, accidental recordings, test recordings ("testing testing one two three")

**Experiment duration:** Pure string operations — <100ms per transcript. Full test set: <1 second.

**Expected yield:** ~1,000+ experiments per overnight run.

**Why this is a good autoresearch target:**
- Blazing fast execution (pure CPU, no API calls)
- Clear binary metric with unambiguous "better" direction
- The current list is hand-picked (17 words) — systematic exploration could find better boundaries
- Also tunes `MIN_MEANINGFUL_WORDS` threshold (currently 3 — could be 2 or 4)

**Risks or blind spots:**
- Narrow search space — there are only so many English filler words. The agent might exhaust the space quickly (diminishing returns after ~20 experiments)
- The two copies (client + Edge Function) must stay in sync — the autoresearch harness would need to edit both files or work on a unified version
- Edge cases are rare in practice — most transcripts are clearly real memories or clearly noise. The improvement ceiling may be low
- Adding common words to the filler list (like "the", "a", "and") could improve the gate but would break the `countMeaningfulWords` function for other uses

---

## Candidate #5: Title Generation Style Tuning

**What gets edited:** A standalone title-generation prompt (extracted from the process-entry system prompt) — specifically the title instructions, examples, and constraints.

**The metric:** Composite title score (0-100) per transcript, averaged across test set:
- **Length compliance** (20%): Binary — is it ≤8 words?
- **Child name usage** (20%): Binary — does it include the child's name when the transcript mentions one?
- **Specificity** (30%): LLM judge (0-10) — does the title capture the specific memory, not a generic label?
- **Warmth** (30%): LLM judge (0-10) — does it feel like a family memory title (not a news headline or academic paper)?

**The test set:** 25 transcripts with human-written "gold standard" titles. Include:
- Names mentioned vs. not mentioned
- Single event vs. multiple events in one entry
- Clear memories vs. rambling/mixed content
- Garbled/incoherent transcripts (should produce null)

**Experiment duration:** ~5-8 seconds per transcript (one Haiku call for generation + one for judging). Full test set: ~3-4 minutes.

**Expected yield:** ~100-150 experiments per overnight run.

**Why this is a good autoresearch target:**
- Faster cycle than Candidate #1 (title-only, not full 3-output prompt)
- Title quality is the most visible AI output — it's what the parent sees on every card in their timeline
- The search space includes: example titles, word count constraints, tone descriptors, formatting rules, child-name-usage instructions
- Isolating title from the combined prompt avoids the cross-output interference risk of Candidate #1

**Risks or blind spots:**
- Partially overlaps with Candidate #1 — running both would be redundant. This is better as a focused follow-up if #1's title scores plateau
- The LLM judge for "warmth" and "specificity" adds subjectivity. Calibration against human ratings is essential
- Results would need to be manually reintegrated back into the combined process-entry prompt
- "Warm" is culturally subjective — what feels warm to one family may feel saccharine to another

---

## Priority Ranking (Best → Worst Autoresearch Fit)

| Rank | Candidate | Why |
|------|-----------|-----|
| **1** | Tag Synonym Map (#2) | Fastest cycles (<2s), clearest metric (F1), largest untapped space (9 of 17 tags have zero synonyms), fully automatic |
| **2** | AI System Prompt (#1) | Highest impact (affects every entry), proven autoresearch pattern, moderate cycle time (~10min) |
| **3** | Title Generation (#5) | Good cycle speed (~4min), most user-visible output, clean isolated metric |
| **4** | Filler Word List (#4) | Ultra-fast but narrow search space — may exhaust quickly |
| **5** | Daily Prompts (#3) | High value but weakest metric (LLM-as-judge proxy with no real engagement data to validate against) |
