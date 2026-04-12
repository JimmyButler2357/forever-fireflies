/**
 * Final Production Prompt Test — Prompt J (G+I hybrid)
 *
 * Runs the combined best-of prompt against 20 new entries
 * (10 classic + 10 edge cases). Solo run — this is the final candidate.
 *
 * Usage:
 *   node tests/prompt-test/run-test-final2.mjs
 *
 * Output: tests/prompt-test/results-final2.md
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

// ─── Production title prompt: J (G + I hybrid) ─────────────────
const TITLE_PROMPT_J = `You title a parent's journal entries about their children. The transcript has already been cleaned up.

Before writing the title, silently identify:
- The single most specific, vivid, or surprising detail in this entry
- Whether a child said something that could ONLY belong to this moment
- The emotional tone (funny, tender, proud, chaotic, bittersweet)

Then craft a title (3–7 words) built around that specific detail.

Choosing the right approach:

1. **Distinctive child quotes** — If the child said something unique and specific — words that could only belong to THIS moment — use them as the title. "Whales Have Feelings Too, Mama" works. "The Dark Is Just the Light Sleeping" works. But generic-sounding quotes ("Right here" / "Let's dance" / "I love you") could be about anything — those need context.

2. **Generic quotes need a scene** — Anchor them with a who, where, or what. "Noah's Fever Day Cuddle" beats "Right Here." "Dancing in the Rain with Noah" beats "Let's Dance."

3. **Milestones need specifics** — Name the actual thing: "Lila Ties Her Shoes at Last" not "Lila's Big Moment."

4. **Chaotic multi-moment entries need the vibe** — Don't pick one random detail. Capture the energy: "Princess Dress and Milky Hands Before Breakfast."

5. **Quiet entries need an image** — Describe what you'd see: "Three Generations Learning to Knit" or "Tiny Sighs at Two A.M."

LLMs tend to produce generic, safe titles like "Noah's Special Day" or "A Sweet Moment with Lila." Fight this tendency. Each title should capture the one unrepeatable detail that makes THIS moment different from every other moment.

The bookmark test: if you cover the entry and only read the title, can you immediately tell WHICH memory this is? If not, revise.

Specificity test: if you swap out the child's name and the title could apply to a thousand other entries, it's too generic — revise.

Vary your title structure — don't always use the same pattern:
- Child's words: "I Think I Picked You"
- Vivid image: "Flour Beach for Dinosaurs"
- Action: "Noah Tells the Cat Everything"
- Sensory detail: "Tiny Sighs at Two A.M."
- Specific fact: "Three Kids, One Hour, Forty-Five Minutes"

Rules:
- 3 to 7 words. Count them. If over 7, shorten.
- Use the child's name when it helps identify whose moment this is
- Capitalize like a book title
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

// ─── Main ───────────────────────────────────────────────────────

async function main() {
  const transcripts = JSON.parse(
    await readFile(join(__dirname, 'transcripts-4.json'), 'utf-8'),
  );

  const totalCalls = transcripts.length * 2; // 1 clean + 1 title each
  console.log(`Running ${transcripts.length} transcripts × 2 calls = ${totalCalls} API calls\n`);

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

  console.log('\n── Generating titles (Prompt J) ──\n');
  const results = [];
  for (const t of transcripts) {
    const cleaned = cleanedMap[t.id];
    process.stdout.write(`  #${t.id} [J] ...`);
    try {
      const parsed = await callHaiku(TITLE_PROMPT_J, cleaned);
      const tags = (parsed.tags ?? [])
        .filter((tg) => tg.confidence >= 0.5)
        .map((tg) => `${tg.slug} (${tg.confidence})`)
        .join(', ');
      results.push({
        id: t.id,
        label: t.label,
        description: t.description,
        title: parsed.title ?? '(null)',
        tags,
      });
      console.log(` ✓  "${parsed.title}"`);
    } catch (err) {
      console.log(` ✗  ${err.message}`);
      results.push({
        id: t.id,
        label: t.label,
        description: t.description,
        title: `ERROR: ${err.message.slice(0, 60)}`,
        tags: '',
      });
    }
    await new Promise((r) => setTimeout(r, 300));
  }

  // ─── Build markdown ───────────────────────────────────────────
  let md = `# Final Production Prompt Test — Prompt J\n\n`;
  md += `**Date**: ${new Date().toISOString().slice(0, 10)}\n`;
  md += `**Model**: ${MODEL}\n`;
  md += `**Prompt**: J — G+I hybrid (bookmark test + specificity-first + anti-generic)\n`;
  md += `**Transcripts**: 20 (10 classic + 10 edge cases)\n\n`;

  md += `---\n\n`;
  md += `## Classic Entries (1-10)\n\n`;

  for (const t of transcripts) {
    if (t.id === 11) {
      md += `## Edge Case Entries (11-20)\n\n`;
    }

    const r = results.find((x) => x.id === t.id);
    md += `### #${t.id} — ${t.label}\n\n`;
    md += `> ${t.description}\n\n`;
    md += `**Title**: ${r.title}\n\n`;
    md += `**Tags**: ${r.tags}\n\n`;
    md += `**Bookmark test**: Can you tell which memory this is from the title alone? \`[ ] Yes  [ ] No\`\n\n`;

    md += `<details><summary>Cleaned transcript</summary>\n\n`;
    md += `${cleanedMap[t.id]}\n\n`;
    md += `</details>\n\n---\n\n`;
  }

  md += `## Overall Assessment\n\n`;
  md += `| Category | Pass Rate | Notes |\n`;
  md += `|----------|-----------|-------|\n`;
  md += `| Classic entries (1-10) | /10 | |\n`;
  md += `| Edge cases (11-20) | /10 | |\n`;
  md += `| Bookmark test passes | /20 | |\n`;
  md += `| Word count (3-7 words) | /20 | |\n`;
  md += `\n`;
  md += `**Final verdict**: Ready for production?  \`[ ] Yes  [ ] Needs tweaks\`\n`;

  const outPath = join(__dirname, 'results-final2.md');
  await writeFile(outPath, md, 'utf-8');
  console.log(`\n✓ Results written to ${outPath}`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
