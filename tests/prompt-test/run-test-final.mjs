/**
 * Final Prompt Test — Prompt G (D+E hybrid)
 *
 * Runs the final hybrid title prompt against both transcript sets
 * (30 total entries) alongside D, E, F for comparison.
 *
 * Usage:
 *   node tests/prompt-test/run-test-final.mjs
 *
 * Output: tests/prompt-test/results-final.md
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

// ─── Title prompts ──────────────────────────────────────────────

const TITLE_PROMPTS = {
  D: {
    name: 'D — Kid\'s Words + Tight Scope',
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

  G: {
    name: 'G — Final Hybrid',
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
  // Load BOTH transcript sets
  const set1 = JSON.parse(await readFile(join(__dirname, 'transcripts.json'), 'utf-8'));
  const set2 = JSON.parse(await readFile(join(__dirname, 'transcripts-2.json'), 'utf-8'));

  // Renumber set2 to start at 16
  const set2Renumbered = set2.map((t, i) => ({ ...t, id: i + 16 }));
  const allTranscripts = [...set1, ...set2Renumbered];

  const promptKeys = Object.keys(TITLE_PROMPTS);
  const totalCalls = allTranscripts.length + (allTranscripts.length * promptKeys.length);
  console.log(`Running ${allTranscripts.length} transcripts: 1 clean + ${promptKeys.length} title calls each = ${totalCalls} API calls\n`);

  // Step 1: Clean all transcripts
  console.log('── Cleaning transcripts ──\n');
  const cleanedMap = {};
  for (const t of allTranscripts) {
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
  for (const t of allTranscripts) {
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
  let md = `# Final Prompt Test — G vs D\n\n`;
  md += `**Date**: ${new Date().toISOString().slice(0, 10)}\n`;
  md += `**Model**: ${MODEL}\n`;
  md += `**Transcripts**: 30 total (both sets combined)\n\n`;

  md += `## Prompt Descriptions\n\n`;
  for (const key of promptKeys) {
    md += `- **${TITLE_PROMPTS[key].name}**\n`;
  }
  md += `\n---\n\n`;

  for (const t of allTranscripts) {
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
  md += `| Prompt | Your Overall Rating | Notes |\n`;
  md += `|--------|--------------------|---------|\n`;
  for (const key of promptKeys) {
    md += `| **${TITLE_PROMPTS[key].name}** | | |\n`;
  }
  md += `\n`;

  const outPath = join(__dirname, 'results-final.md');
  await writeFile(outPath, md, 'utf-8');
  console.log(`\n✓ Results written to ${outPath}`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
