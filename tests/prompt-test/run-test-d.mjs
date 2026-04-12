/**
 * Prompt D Test Runner — Two-Call Approach
 *
 * Call 1: Clean the transcript (filler removal, punctuation, error fixes)
 * Call 2: Generate title + tags from the cleaned transcript
 *
 * Compares results against the A/B/C single-call results from the first run.
 *
 * Usage:
 *   node tests/prompt-test/run-test-d.mjs
 *
 * Output: tests/prompt-test/results-d.md
 */

import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-haiku-4-5-20251001';

// Read API key from .env.local at the project root
let API_KEY = process.env.ANTHROPIC_API_KEY;
if (!API_KEY) {
  try {
    const envFile = await readFile(join(__dirname, '..', '..', '.env.local'), 'utf-8');
    const match = envFile.match(/^ANTHROPIC_API_KEY=(.+)$/m);
    if (match) API_KEY = match[1].trim();
  } catch { /* file not found, fall through */ }
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

// ─── Call 1: Transcript Cleaning Prompt ─────────────────────────
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

// ─── Call 2: Title + Tags Prompt ────────────────────────────────
const TITLE_PROMPT = `You title a parent's journal entries about their children. The transcript has already been cleaned up — just read it and give it a name.

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

JSON only, no markdown, no explanation.`;

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

// ─── Load previous A/B/C results for comparison ─────────────────

function parseOldResults(md) {
  // Parse the results.md to extract A/B/C titles and tags per entry
  const entries = {};
  const entryBlocks = md.split(/^## #(\d+)/m);

  for (let i = 1; i < entryBlocks.length; i += 2) {
    const id = parseInt(entryBlocks[i], 10);
    const block = entryBlocks[i + 1] || '';

    // Parse table rows: | **A** | title | tags | |
    const rows = block.match(/\| \*\*([ABC])\*\* \| (.+?) \| (.+?) \|.*\|/g);
    if (!rows) continue;

    entries[id] = {};
    for (const row of rows) {
      const m = row.match(/\| \*\*([ABC])\*\* \| (.+?) \| (.*?) \|/);
      if (m) {
        entries[id][m[1]] = { title: m[2].trim(), tags: m[3].trim() };
      }
    }

    // Parse cleaned transcripts
    const detailsMatch = block.match(/<details><summary>Cleaned transcripts<\/summary>([\s\S]*?)<\/details>/);
    if (detailsMatch) {
      const detailsBlock = detailsMatch[1];
      for (const key of ['A', 'B', 'C']) {
        const tMatch = detailsBlock.match(new RegExp(`\\*\\*${key}\\*\\*: ([\\s\\S]*?)(?=\\*\\*[ABC]\\*\\*:|$)`));
        if (tMatch && entries[id][key]) {
          entries[id][key].cleaned_transcript = tMatch[1].trim();
        }
      }
    }
  }
  return entries;
}

// ─── Main ───────────────────────────────────────────────────────

async function main() {
  const transcripts = JSON.parse(
    await readFile(join(__dirname, 'transcripts.json'), 'utf-8'),
  );

  // Load old results for comparison
  let oldResults = {};
  try {
    const oldMd = await readFile(join(__dirname, 'results.md'), 'utf-8');
    oldResults = parseOldResults(oldMd);
  } catch {
    console.warn('Warning: results.md not found, comparison columns will be empty\n');
  }

  const results = [];
  const totalCalls = transcripts.length * 2;
  console.log(`Running ${transcripts.length} transcripts × 2 calls each = ${totalCalls} API calls\n`);

  for (const t of transcripts) {
    // ── Call 1: Clean transcript ──
    process.stdout.write(`  #${t.id} [clean] ...`);
    let cleanedTranscript = '';
    try {
      const cleanResult = await callHaiku(CLEAN_PROMPT, t.transcript);
      cleanedTranscript = cleanResult.cleaned_transcript ?? '';
      console.log(` ✓`);
    } catch (err) {
      console.log(` ✗  ${err.message}`);
      cleanedTranscript = t.transcript; // fallback to raw
    }

    await new Promise((r) => setTimeout(r, 400));

    // ── Call 2: Title + tags from cleaned transcript ──
    process.stdout.write(`  #${t.id} [title] ...`);
    let title = '(null)';
    let tags = '';
    try {
      const titleResult = await callHaiku(TITLE_PROMPT, cleanedTranscript);
      title = titleResult.title ?? '(null)';
      tags = (titleResult.tags ?? [])
        .filter((tg) => tg.confidence >= 0.5)
        .map((tg) => `${tg.slug} (${tg.confidence})`)
        .join(', ');
      console.log(` ✓  "${title}"`);
    } catch (err) {
      console.log(` ✗  ${err.message}`);
      title = `ERROR: ${err.message.slice(0, 60)}`;
    }

    results.push({
      id: t.id,
      label: t.label,
      description: t.description,
      rawTranscript: t.transcript,
      cleanedTranscript,
      title,
      tags,
    });

    await new Promise((r) => setTimeout(r, 400));
  }

  // ─── Build comparison markdown ────────────────────────────────
  let md = `# Prompt D — Two-Call Test Results\n\n`;
  md += `**Date**: ${new Date().toISOString().slice(0, 10)}\n`;
  md += `**Model**: ${MODEL}\n`;
  md += `**Approach**: Call 1 cleans transcript → Call 2 generates title + tags from clean text\n\n`;

  md += `## Prompt Descriptions\n\n`;
  md += `- **A** (baseline): Current production prompt — single call, structured, example-heavy\n`;
  md += `- **B**: Single call — warmer framing, encourages evocative/emotional titles\n`;
  md += `- **C**: Single call — minimal instruction, trusts the model\n`;
  md += `- **D** (new): Two calls — dedicated cleaning pass, then title+tags from clean transcript\n`;
  md += `\n---\n\n`;

  for (const r of results) {
    const old = oldResults[r.id] || {};

    md += `## #${r.id} — ${r.label}\n\n`;
    md += `> ${r.description}\n\n`;
    md += `**Raw transcript**: "${r.rawTranscript.slice(0, 120)}${r.rawTranscript.length > 120 ? '...' : ''}"\n\n`;

    // Title comparison table
    md += `| Prompt | Title | Tags | Your Rating |\n`;
    md += `|--------|-------|------|-------------|\n`;
    if (old.A) md += `| **A** | ${old.A.title} | ${old.A.tags} | |\n`;
    if (old.B) md += `| **B** | ${old.B.title} | ${old.B.tags} | |\n`;
    if (old.C) md += `| **C** | ${old.C.title} | ${old.C.tags} | |\n`;
    md += `| **D** | ${r.title} | ${r.tags} | |\n`;
    md += `\n`;

    // Cleaned transcript comparison
    md += `<details><summary>Cleaned transcripts</summary>\n\n`;
    if (old.A) md += `**A**: ${old.A.cleaned_transcript ?? ''}\n\n`;
    if (old.B) md += `**B**: ${old.B.cleaned_transcript ?? ''}\n\n`;
    if (old.C) md += `**C**: ${old.C.cleaned_transcript ?? ''}\n\n`;
    md += `**D**: ${r.cleanedTranscript}\n\n`;
    md += `</details>\n\n---\n\n`;
  }

  md += `## Summary\n\n`;
  md += `| Prompt | Approach | Your Overall Rating | Notes |\n`;
  md += `|--------|----------|--------------------|---------|\n`;
  md += `| **A** | Single call, structured | | |\n`;
  md += `| **B** | Single call, warm/evocative | | |\n`;
  md += `| **C** | Single call, minimal | | |\n`;
  md += `| **D** | Two calls (clean → title) | | |\n`;
  md += `\n`;

  const outPath = join(__dirname, 'results-d.md');
  await writeFile(outPath, md, 'utf-8');
  console.log(`\n✓ Results written to ${outPath}`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
