/**
 * Prompt D/E/F Title Test Runner — Round 2
 *
 * All three use the same transcript cleaner (Call 1).
 * Compares three different title+tag prompts (Call 2).
 * Uses 15 brand new transcripts.
 *
 * Usage:
 *   node tests/prompt-test/run-test-def.mjs
 *
 * Output: tests/prompt-test/results-def.md
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

// ─── Shared transcript cleaner (same for all three) ─────────────
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

// ─── Three title prompt variants ────────────────────────────────

const TITLE_PROMPTS = {
  D: {
    name: 'D — Kid\'s Words + Tight Scope',
    description: 'Prioritizes using the child\'s actual words. Zooms out for multi-moment entries.',
    system: `You title a parent's journal entries about their children. The transcript has already been cleaned up — just read it and give it a name.

Your title should be the kind of thing that makes a parent smile when they scroll past it a year from now. Aim for the heart of the moment.

Guidelines:
- STRICT maximum of 8 words. Count them. If your title is 9+ words, shorten it. Trim quotes to fit if needed.
- When a child says something memorable, use their actual words as the title (e.g., "What If My Dreams Are Better" instead of "Noah's Bedtime Question")
- When the moment is about an action or milestone, name the specific thing (e.g., "Noah Rides Without Training Wheels" not "Noah's Big Moment")
- Keep the scope tight — title the actual moment, not a broader theme. "Lila Walks to Her Room Alone" not "Lila Doesn't Need Me Anymore"
- For entries with multiple moments or a chaotic mix of events, zoom out and capture the overall feeling or theme rather than picking one quote (e.g., "Perfect Chaos Before Breakfast" not a single line from the story)
- Use the child's name when it feels natural
- If the transcript is garbled or doesn't describe a real moment, set title to null

Return a JSON object with two fields:

1. "title": the title string (or null)
2. "tags": array of {"slug", "confidence"} objects. Pick the most relevant from: [${TAG_TAXONOMY}]. Maximum 3, only confidence >= 0.5.

JSON only, no markdown, no explanation.`,
  },

  E: {
    name: 'E — Moment Type Strategy',
    description: 'Identifies the type of moment first, then applies a matching title strategy.',
    system: `You title a parent's journal entries about their children. The transcript has already been cleaned up.

First, identify which type of moment this is:
- QUOTE: A child said something memorable — use their exact words (trimmed to fit)
- MILESTONE: A child did something for the first time or grew in some way — name the specific achievement
- SNAPSHOT: An ordinary moment that felt special — describe what you'd see if you walked in (e.g., "Sharing Crayons on the Kitchen Floor")
- FEELING: The parent is reflecting on an emotion — capture how they felt, not what happened (e.g., "I Wasn't Ready to Let Go")
- CHAOS: Multiple things happening, messy and alive — capture the energy (e.g., "Pancakes, Milk, and Princess Dresses")

Then write the title using the strategy that matches.

Rules:
- STRICT maximum of 8 words. Count them. If over, shorten.
- Use the child's name when natural, but don't force it
- Titles should feel specific to THIS moment — if it could apply to any kid, it's too generic
- If the transcript is garbled or doesn't describe a real moment, set title to null

Return a JSON object with two fields:

1. "title": the title string (or null)
2. "tags": array of {"slug", "confidence"} objects. Pick the most relevant from: [${TAG_TAXONOMY}]. Maximum 3, only confidence >= 0.5.

JSON only, no markdown, no explanation.`,
  },

  F: {
    name: 'F — Show Don\'t Tell',
    description: 'Focuses on concrete images and sensory details rather than descriptions or labels.',
    system: `You title a parent's journal entries about their children. The transcript has already been cleaned up.

Write a title that paints a picture. A great title is a tiny snapshot — when the parent reads it a year later, they should immediately SEE the moment again.

Prioritize in this order:
1. The child's own words, if something they said is the heart of the entry
2. A concrete image from the story (e.g., "Bubbles on Her Chin, Dead Serious" not "Funny Bath Time")
3. A specific sensory detail (e.g., "Her Little Face Lit Up by the Sun" not "Beautiful Car Ride")

Avoid:
- Generic labels: "Sweet Moment," "Funny Story," "Big Milestone"
- "[Child's Name]'s [Abstract Noun]" patterns: "Noah's Adventure," "Lila's Growth"
- Anything that could be a chapter title in a parenting book. This should feel like a scribbled Post-it note on a photo, not a headline.

Rules:
- STRICT maximum of 8 words. Count them. If over, shorten.
- Use the child's name when natural
- If the transcript is garbled or doesn't describe a real moment, set title to null

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

// ─── Main ────────────────────────────────────���──────────────────

async function main() {
  const transcripts = JSON.parse(
    await readFile(join(__dirname, 'transcripts-2.json'), 'utf-8'),
  );

  const promptKeys = Object.keys(TITLE_PROMPTS);
  const totalCalls = transcripts.length + (transcripts.length * promptKeys.length);
  console.log(`Running ${transcripts.length} transcripts: 1 clean + ${promptKeys.length} title calls each = ${totalCalls} API calls\n`);

  // Step 1: Clean all transcripts first
  const cleanedMap = {}; // id -> cleaned transcript
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
    await new Promise((r) => setTimeout(r, 400));
  }

  console.log('');

  // Step 2: Run all three title prompts on cleaned transcripts
  const results = []; // { id, label, promptKey, title, tags }
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
      await new Promise((r) => setTimeout(r, 400));
    }
  }

  // ─── Build output markdown ──────────────────────────────────
  let md = `# Prompt D/E/F Title Test — Round 2\n\n`;
  md += `**Date**: ${new Date().toISOString().slice(0, 10)}\n`;
  md += `**Model**: ${MODEL}\n`;
  md += `**Transcript cleaner**: Same for all three (shared Call 1)\n`;
  md += `**Transcripts**: 15 new entries (different from Round 1)\n\n`;

  md += `## Prompt Descriptions\n\n`;
  for (const key of promptKeys) {
    md += `- **${TITLE_PROMPTS[key].name}**: ${TITLE_PROMPTS[key].description}\n`;
  }
  md += `\n---\n\n`;

  for (const t of transcripts) {
    md += `## #${t.id} — ${t.label}\n\n`;
    md += `> ${t.description}\n\n`;
    md += `**Cleaned transcript**: "${cleanedMap[t.id].slice(0, 150)}${cleanedMap[t.id].length > 150 ? '...' : ''}"\n\n`;
    md += `| Prompt | Title | Tags | Your Rating |\n`;
    md += `|--------|-------|------|-------------|\n`;
    for (const key of promptKeys) {
      const r = results.find((x) => x.id === t.id && x.promptKey === key);
      md += `| **${key}** | ${r.title} | ${r.tags} | |\n`;
    }
    md += `\n`;

    // Full cleaned transcript in details
    md += `<details><summary>Full cleaned transcript</summary>\n\n`;
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

  const outPath = join(__dirname, 'results-def.md');
  await writeFile(outPath, md, 'utf-8');
  console.log(`\n✓ Results written to ${outPath}`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
