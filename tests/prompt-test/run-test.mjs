/**
 * Prompt A/B/C Test Runner
 *
 * Sends 15 sample transcripts through 3 different system prompts
 * using Claude Haiku, then writes all results to a comparison table.
 *
 * Usage:
 *   ANTHROPIC_API_KEY=sk-ant-... node tests/prompt-test/run-test.mjs
 *
 * Output: tests/prompt-test/results.md  (a markdown table you can review)
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

// ─── Tag taxonomy (matches the 17 system tags in the DB) ────────
const TAG_TAXONOMY = [
  'humor', 'milestone', 'first', 'sports', 'school', 'health',
  'birthday', 'holiday', 'family', 'friendship', 'creativity',
  'nature', 'food', 'bedtime', 'travel', 'sweet-moment', 'other',
].join(', ');

// ─── Three prompt variants ──────────────────────────────────────

const PROMPTS = {
  A: {
    name: 'A — Current (Structured)',
    system: `You are a family memory organizer. A parent just recorded a voice journal entry about their child. Return a JSON object with exactly these three fields:

1. "title": A short, warm title for this memory (maximum 8 words). Use the child's name if mentioned. Examples: "Emma's First Giggle", "Bath Time Chaos", "Dancing in the Rain". Do not wrap the title in quotes. If the transcript is garbled, incoherent, or doesn't describe a recognizable memory, set title to null.

2. "cleaned_transcript": The same transcript with any remaining filler words removed (um, uh, like, you know, so, basically, I mean, kind of, sort of) and obvious speech-to-text errors fixed. Clean up extra spaces (the speech engine sometimes leaves gaps where it removed filler words). Capitalize the first word of every sentence. IMPORTANT: Preserve the parent's authentic voice and meaning. Do NOT rewrite, summarize, or paraphrase. Only remove filler and fix errors.

3. "tags": An array of objects, each with "slug" and "confidence" (0.0 to 1.0). Pick the most relevant tags from this taxonomy: [${TAG_TAXONOMY}]. Maximum 3 tags. Only include tags with confidence >= 0.5.

Return ONLY valid JSON. No markdown, no explanation, no code fences.`,
  },

  B: {
    name: 'B — Warmer / Storytelling',
    system: `You help parents treasure their children's moments. A parent just recorded a voice memory. Your job is to give it a title that captures the feeling — the kind of title that will make them smile when they scroll past it months later.

Return a JSON object with these three fields:

1. "title": A warm, evocative title (maximum 8 words). Capture the emotion or heart of the moment, not just the event. Use the child's name when mentioned. Think like a scrapbook caption — "The Cure for the Sillies" is better than "Kids Playing Doctor." If the transcript doesn't describe a real moment, set title to null.

2. "cleaned_transcript": Remove filler words (um, uh, like, you know, so, basically, I mean, kind of, sort of) and fix obvious speech-to-text errors. Clean up double spaces. Capitalize the first word of every sentence. CRITICAL: Keep the parent's real voice. Do not rewrite, polish, or paraphrase. These words are theirs.

3. "tags": An array of objects with "slug" and "confidence" (0.0–1.0). Choose from: [${TAG_TAXONOMY}]. Maximum 3. Only include tags with confidence >= 0.5.

Return ONLY valid JSON. No markdown, no explanation, no code fences.`,
  },

  C: {
    name: 'C — Minimal / Trust the Model',
    system: `A parent recorded a voice journal entry about their child. Return JSON with three fields:

1. "title": Short, warm title (max 8 words). Use the child's name if mentioned. Set to null if the transcript is incoherent.

2. "cleaned_transcript": Same text with filler words removed and speech-to-text errors fixed. Do not rewrite or paraphrase — preserve the parent's voice exactly.

3. "tags": Array of {"slug", "confidence"} objects. Pick up to 3 from: [${TAG_TAXONOMY}]. Only confidence >= 0.5.

JSON only, no markdown.`,
  },
};

// ─── API call ───────────────────────────────────────────────────

async function callHaiku(systemPrompt, transcript) {
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
      messages: [{ role: 'user', content: transcript }],
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Anthropic API ${res.status}: ${errText}`);
  }

  const data = await res.json();
  let content = data.content?.[0]?.text ?? '';
  // Strip code fences
  content = content.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();
  return JSON.parse(content);
}

// ─── Main ───────────────────────────────────────────────────────

async function main() {
  const transcripts = JSON.parse(
    await readFile(join(__dirname, 'transcripts.json'), 'utf-8'),
  );

  const promptKeys = Object.keys(PROMPTS);
  const results = []; // { id, label, promptKey, title, tags, cleaned_transcript }

  console.log(`Running ${transcripts.length} transcripts × ${promptKeys.length} prompts = ${transcripts.length * promptKeys.length} API calls\n`);

  for (const t of transcripts) {
    for (const key of promptKeys) {
      const tag = `#${t.id} [${key}]`;
      process.stdout.write(`  ${tag} ...`);
      try {
        const parsed = await callHaiku(PROMPTS[key].system, t.transcript);
        const tags = (parsed.tags ?? [])
          .filter((tg) => tg.confidence >= 0.5)
          .map((tg) => `${tg.slug} (${tg.confidence})`)
          .join(', ');
        results.push({
          id: t.id,
          label: t.label,
          promptKey: key,
          promptName: PROMPTS[key].name,
          title: parsed.title ?? '(null)',
          tags,
          cleaned_transcript: parsed.cleaned_transcript ?? '',
        });
        console.log(` ✓  "${parsed.title}"`);
      } catch (err) {
        console.log(` ✗  ${err.message}`);
        results.push({
          id: t.id,
          label: t.label,
          promptKey: key,
          promptName: PROMPTS[key].name,
          title: `ERROR: ${err.message.slice(0, 60)}`,
          tags: '',
          cleaned_transcript: '',
        });
      }

      // Small delay to avoid rate limits
      await new Promise((r) => setTimeout(r, 500));
    }
  }

  // ─── Build output markdown ──────────────────────────────────
  let md = `# Prompt A/B/C Test Results\n\n`;
  md += `**Date**: ${new Date().toISOString().slice(0, 10)}\n`;
  md += `**Model**: ${MODEL}\n`;
  md += `**Transcripts**: ${transcripts.length}\n\n`;

  md += `## Prompt Descriptions\n\n`;
  for (const key of promptKeys) {
    md += `- **${PROMPTS[key].name}**: ${key === 'A' ? 'Current production prompt — structured, example-heavy' : key === 'B' ? 'Warmer framing, encourages evocative/emotional titles' : 'Stripped down, minimal instruction, trusts the model'}\n`;
  }
  md += `\n---\n\n`;

  // One section per transcript, with a comparison table
  for (const t of transcripts) {
    md += `## #${t.id} — ${t.label}\n\n`;
    md += `> ${t.description}\n\n`;
    md += `**Transcript**: "${t.transcript.slice(0, 120)}${t.transcript.length > 120 ? '...' : ''}"\n\n`;
    md += `| Prompt | Title | Tags | Your Rating |\n`;
    md += `|--------|-------|------|-------------|\n`;
    for (const key of promptKeys) {
      const r = results.find((x) => x.id === t.id && x.promptKey === key);
      md += `| **${key}** | ${r.title} | ${r.tags} | |\n`;
    }
    md += `\n`;

    // Add cleaned transcript comparison
    md += `<details><summary>Cleaned transcripts</summary>\n\n`;
    for (const key of promptKeys) {
      const r = results.find((x) => x.id === t.id && x.promptKey === key);
      md += `**${key}**: ${r.cleaned_transcript}\n\n`;
    }
    md += `</details>\n\n---\n\n`;
  }

  md += `## Summary\n\n`;
  md += `| Prompt | Your Overall Rating | Notes |\n`;
  md += `|--------|--------------------|---------|\n`;
  for (const key of promptKeys) {
    md += `| **${PROMPTS[key].name}** | | |\n`;
  }
  md += `\n`;

  const outPath = join(__dirname, 'results.md');
  await writeFile(outPath, md, 'utf-8');
  console.log(`\n✓ Results written to ${outPath}`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
