/**
 * Prompt G/H/I Title Test — Round 3
 *
 * G: Current best (bookmark test, contextual quotes)
 * H: Few-shot examples approach (show don't tell via examples)
 * I: Specificity-first (find the unique detail before titling)
 *
 * All share the same transcript cleaner.
 * Uses 15 new transcripts with edge cases.
 *
 * Usage:
 *   node tests/prompt-test/run-test-ghi.mjs
 *
 * Output: tests/prompt-test/results-ghi.md
 */

import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-haiku-4-5-20251001';

// Read API key from .env.local
let API_KEY = process.env.ANTHROPIC_API_KEY;
if (!API_KEY) {
  try {
    const envFile = await readFile(join(__dirname, '..', '..', '.env.local'), 'utf-8');
    const match = envFile.match(/^ANTHROPIC_API_KEY=(.+)$/m);
    if (match) API_KEY = match[1].trim();
  } catch { /* file not found */ }
}
if (!API_KEY) {
  console.error('ERROR: Add ANTHROPIC_API_KEY to .env.local');
  process.exit(1);
}

// ─── Tag taxonomy ───────────────────────────────────────────────
const TAG_TAXONOMY = [
  'humor', 'milestone', 'first', 'sports', 'school', 'health',
  'birthday', 'holiday', 'family', 'friendship', 'creativity',
  'nature', 'food', 'bedtime', 'travel', 'sweet-moment', 'other',
].join(', ');

// ─── Shared transcript cleaner ──────────────────────────────────
const CLEAN_PROMPT = `You clean up voice-to-text transcripts from a parenting journal app. A parent recorded a voice memo about their child and the speech engine transcribed it. Your job is to make it readable while keeping it sounding exactly like them.

Rules:
- Remove filler words: um, uh, like, you know, so, basically, I mean, kind of, sort of, well, oh, okay, anyway
- Only remove "like" and "so" when used as filler — keep them when they carry meaning ("she was like okay" → keep, "it was like ten feet" → keep, "I was like so tired" → remove "like")
- Fix obvious speech-to-text errors and garbled words
- Add punctuation: periods, commas, question marks, exclamation marks where natural
- Add quotation marks around direct speech (things the child or others said)
- Capitalize the first word of every sentence
- Clean up extra spaces and gaps left by the speech engine
- NEVER rewrite, summarize, rephrase, or change the parent's words. Their voice is sacred. You are tidying, not editing.
- Keep contractions, casual phrasing, and sentence fragments — that's how people talk

Return a JSON object with one field:
"cleaned_transcript": the cleaned text

JSON only, no markdown, no explanation.`;

// ─── Three title prompts ────────────────────────────────────────

const TITLE_PROMPTS = {
  G: {
    name: 'G — Bookmark Test (current best)',
    description: 'Contextual quotes, bookmark test, 5 strategies by moment type',
    system: `You title a parent's journal entries about their children. The transcript has already been cleaned up — just read it and give it a name.

A great title is a bookmark that doesn't need the book open. A parent scrolling through hundreds of entries a year from now should read the title and immediately remember the moment — without tapping into the entry.

How to choose the right title:

1. **Distinctive quotes come first.** If the child said something unique and specific — words that could only belong to THIS moment — use them. "Whales Have Feelings Too, Mama" is great. "I Think I Picked You" is great. But "Right Here" or "Let's Dance" could be about anything — those need context instead.

2. **If the quote is generic, add the scene.** Anchor it with a who, where, or what. "Noah's Fever Day Cuddle" tells you more than "Right Here." "Dancing in the Rain with Noah" tells you more than "Let's Dance."

3. **For milestones, name the specific thing.** "Lila Ties Her Shoes for the First Time" beats "Lila's Big Moment." Be concrete.

4. **For multi-moment or chaotic entries, capture the vibe.** Don't pick one random quote from a messy morning. Zoom out: "Perfect Chaos Before Breakfast" or "Pancakes, Milk, and Princess Dresses."

5. **For quiet/reflective entries, describe what you'd see.** Paint the image: "Three Generations Learning to Knit" or "Sharing Crayons on the Kitchen Floor."

The test: if you cover the entry and only read the title, can you tell WHICH memory this is? If not, revise.

Rules:
- STRICT maximum of 8 words. Count them. If over, shorten.
- Use the child's name when it helps identify the moment
- Capitalize the title like a book title
- If the transcript is garbled or doesn't describe a real moment, set title to null

Return a JSON object with two fields:

1. "title": the title string (or null)
2. "tags": array of {"slug", "confidence"} objects. Pick the most relevant from: [${TAG_TAXONOMY}]. Maximum 3, only confidence >= 0.5.

JSON only, no markdown, no explanation.`,
  },

  H: {
    name: 'H — Few-Shot Examples',
    description: 'Teaches through diverse examples instead of rules. Pattern matching over instruction following.',
    system: `You are a parent's memory keeper — you capture the heart of a moment in just a few words, the way a scrapbook caption does.

A parent will share a journal entry about their child. Give it a title (3–7 words) that will bring the memory flooding back a year from now without needing to re-read the entry.

<examples>
<example>
<transcript>Noah just rode his bike without training wheels for the first time. He was so scared at first, but then he just went and he was screaming, "I'm doing it, I'm doing it!" and I was running behind him crying.</transcript>
<title>Noah Rides Without Training Wheels</title>
<why>Milestone — name the specific achievement, not "Noah's Big Day"</why>
</example>
<example>
<transcript>Lila made a beard out of bubbles in the bath tonight and looked at me dead serious and said, "I'm daddy now and I'm going to watch the football and drink my coffee."</transcript>
<title>Lila's Bubble Beard Daddy Impression</title>
<why>The quote is funny but too long — describe the vivid image instead</why>
</example>
<example>
<transcript>Noah has been terrified of the dark, really scared. Tonight he said he wanted to try sleeping without the nightlight. After a minute he goes "It's not so bad actually" and then said "Mama, I think the dark is just the light sleeping."</transcript>
<title>The Dark Is Just the Light Sleeping</title>
<why>Quote is unique and unforgettable — use it directly</why>
</example>
<example>
<transcript>Nothing remarkable, just a normal Tuesday morning, but Lila poured Noah's cereal for him without being asked and then Noah got up and got her a napkin without being asked. They just kept eating and talking, like a little team without even knowing it.</transcript>
<title>Their Little Tuesday Morning Team</title>
<why>No standout quote — capture the quiet scene with enough context to place it</why>
</example>
<example>
<transcript>Oh man, this morning was chaos. Lila woke up at five thirty, Noah spilled milk everywhere making pancakes, then Lila comes in wearing her princess dress over pajamas saying "I'm ready for the ball" and Noah hugs her with milky hands and she doesn't even care. Honestly, it was perfect.</transcript>
<title>Princess Dress and Milky Hands Before Breakfast</title>
<why>Chaotic multi-moment — pick the most vivid image that captures the energy</why>
</example>
</examples>

Rules:
- 3 to 7 words. If your title exceeds 7 words, shorten it.
- Use the child's name when it helps identify whose moment this is
- Capitalize like a book title
- If the transcript doesn't describe a real moment, set title to null

Return a JSON object with two fields:

1. "title": the title string (or null)
2. "tags": array of {"slug", "confidence"} objects. Pick the most relevant from: [${TAG_TAXONOMY}]. Maximum 3, only confidence >= 0.5.

JSON only, no markdown, no explanation.`,
  },

  I: {
    name: 'I — Specificity First',
    description: 'Identifies the unique detail first, fights generic tendencies, tighter word range.',
    system: `You title a parent's journal entries about their children. The transcript has already been cleaned up.

Before writing the title, silently identify:
- The single most specific, vivid, or surprising detail in this entry
- Whether a child said something that could ONLY belong to this moment
- The emotional tone (funny, tender, proud, chaotic, bittersweet)

Then craft a title (3–7 words) built around that specific detail.

LLMs tend to produce generic, safe titles like "Noah's Special Day" or "A Sweet Moment with Lila." Fight this. Every title should capture the one unrepeatable detail that makes THIS moment different from every other moment. If you replaced the child's name and the title could still apply to a thousand other entries, it's too generic — revise.

Specificity test examples:
- TOO GENERIC: "Lila's Big Milestone" → SPECIFIC: "Lila Ties Her Shoes at Last"
- TOO GENERIC: "A Beautiful Moment" → SPECIFIC: "His Whole Hand Around My Finger"
- TOO GENERIC: "Noah Said Something Funny" → SPECIFIC: "Whales Have Feelings Too, Mama"
- TOO GENERIC: "Bedtime Chaos" → SPECIFIC: "Three Kids, One Hour, Forty-Five Minutes"

Structure variety — don't always use the same pattern. Mix it up:
- Child's words: "I Think I Picked You"
- Vivid image: "Flour Beach for Dinosaurs"
- Action: "Noah Tells the Cat Everything"
- Sensory detail: "Tiny Sighs at Two A.M."

Rules:
- 3 to 7 words. Count them. Shorten if over.
- Use the child's name when it helps identify the moment
- Capitalize like a book title
- If the transcript doesn't describe a real moment, set title to null

Return a JSON object with two fields:

1. "title": the title string (or null)
2. "tags": array of {"slug", "confidence"} objects. Pick the most relevant from: [${TAG_TAXONOMY}]. Maximum 3, only confidence >= 0.5.

JSON only, no markdown, no explanation.`,
  },
};

// ─── API call helper ────────────────────────────────────────────

async function callHaiku(systemPrompt, userMessage) {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Anthropic API ${res.status}: ${errText}`);
  }

  const data = await res.json();
  let content = data.content?.[0]?.text ?? '';
  content = content.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();
  return JSON.parse(content);
}

// ─── Main ───────────────────────────────────────────────────────

async function main() {
  const transcripts = JSON.parse(
    await readFile(join(__dirname, 'transcripts-3.json'), 'utf-8'),
  );

  const promptKeys = Object.keys(TITLE_PROMPTS);
  const totalCalls = transcripts.length + (transcripts.length * promptKeys.length);
  console.log(`Running ${transcripts.length} transcripts: 1 clean + ${promptKeys.length} title calls each = ${totalCalls} API calls\n`);

  // Step 1: Clean all transcripts
  console.log('── Cleaning transcripts ──\n');
  const cleanedMap = {};
  for (const t of transcripts) {
    process.stdout.write(`  #${t.id} [clean] ...`);
    try {
      const result = await callHaiku(CLEAN_PROMPT, t.transcript);
      cleanedMap[t.id] = result.cleaned_transcript ?? t.transcript;
      console.log(` ✓`);
    } catch (err) {
      console.log(` ✗  ${err.message}`);
      cleanedMap[t.id] = t.transcript;
    }
    await new Promise((r) => setTimeout(r, 300));
  }

  // Step 2: Run title prompts
  console.log('\n── Generating titles ──\n');
  const results = [];
  for (const t of transcripts) {
    const cleaned = cleanedMap[t.id];
    for (const key of promptKeys) {
      process.stdout.write(`  #${t.id} [${key}] ...`);
      try {
        const parsed = await callHaiku(TITLE_PROMPTS[key].system, cleaned);
        const tags = (parsed.tags ?? [])
          .filter((tg) => tg.confidence >= 0.5)
          .map((tg) => `${tg.slug} (${tg.confidence})`)
          .join(', ');
        results.push({
          id: t.id,
          label: t.label,
          promptKey: key,
          title: parsed.title ?? '(null)',
          tags,
        });
        console.log(` ✓  "${parsed.title}"`);
      } catch (err) {
        console.log(` ✗  ${err.message}`);
        results.push({
          id: t.id,
          label: t.label,
          promptKey: key,
          title: `ERROR: ${err.message.slice(0, 60)}`,
          tags: '',
        });
      }
      await new Promise((r) => setTimeout(r, 300));
    }
  }

  // ─── Build markdown ───────────────────────────────────────────
  let md = `# Prompt G/H/I Title Test — Round 3\n\n`;
  md += `**Date**: ${new Date().toISOString().slice(0, 10)}\n`;
  md += `**Model**: ${MODEL}\n`;
  md += `**Transcript cleaner**: Shared (same Call 1 for all)\n`;
  md += `**Transcripts**: 15 new entries with edge cases (3+ children, newborn, twins, nonverbal, public embarrassment, discipline)\n\n`;

  md += `## Prompt Descriptions\n\n`;
  for (const key of promptKeys) {
    md += `- **${TITLE_PROMPTS[key].name}**: ${TITLE_PROMPTS[key].description}\n`;
  }
  md += `\n---\n\n`;

  for (const t of transcripts) {
    md += `## #${t.id} — ${t.label}\n\n`;
    md += `> ${t.description}\n\n`;

    md += `| Prompt | Title | Tags | Your Rating |\n`;
    md += `|--------|-------|------|-------------|\n`;
    for (const key of promptKeys) {
      const r = results.find((x) => x.id === t.id && x.promptKey === key);
      md += `| **${key}** | ${r.title} | ${r.tags} | |\n`;
    }
    md += `\n`;

    md += `<details><summary>Cleaned transcript</summary>\n\n`;
    md += `${cleanedMap[t.id]}\n\n`;
    md += `</details>\n\n---\n\n`;
  }

  md += `## Summary\n\n`;
  md += `| Prompt | Approach | Your Overall Rating | Notes |\n`;
  md += `|--------|----------|--------------------|---------|\n`;
  for (const key of promptKeys) {
    md += `| **${TITLE_PROMPTS[key].name}** | ${TITLE_PROMPTS[key].description} | | |\n`;
  }
  md += `\n`;

  const outPath = join(__dirname, 'results-ghi.md');
  await writeFile(outPath, md, 'utf-8');
  console.log(`\n✓ Results written to ${outPath}`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
