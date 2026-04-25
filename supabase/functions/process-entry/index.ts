// Process Entry — Supabase Edge Function
//
// Called after an entry is created or its transcript is edited.
// Sends the transcript to Claude Haiku and gets back three things:
//   1. A warm, short title (e.g., "Emma's First Giggle")
//   2. A cleaned-up transcript (filler words removed)
//   3. Smart tag suggestions with confidence scores
//
// Think of it like a helpful assistant who reads your journal
// entry and adds a nice title, tidies up the "um"s, and
// sticks the right labels on it — all in one pass.
//
// The parent's authentic voice is sacred — the AI removes
// filler words but never rewrites, summarizes, or paraphrases.

import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';

// CORS headers — needed so browsers (localhost dev, web builds) can call this function.
// Native mobile apps don't need CORS, but it doesn't hurt to include it.
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  // Handle CORS preflight — the browser sends an OPTIONS request first
  // to ask "is this cross-origin request allowed?" We say yes.
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // ─── Parse request body ───────────────────────────
    const { entry_id } = await req.json();
    if (!entry_id || typeof entry_id !== 'string') {
      return new Response(
        JSON.stringify({ error: 'entry_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // ─── Supabase client (service role for DB writes) ──
    // Service role bypasses RLS so the function can read/write
    // any entry. Because verify_jwt = false in config.toml (RN's
    // functions.invoke() can't reliably send the JWT header), we
    // extract the Bearer token manually and verify identity via
    // auth.getUser(token) — mirroring delete-account's pattern.
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // ─── Verify caller identity ───────────────────────
    // Extract the Bearer token from the Authorization header and
    // resolve it to a user via auth.getUser. Never trust a
    // caller-supplied userId — always derive it from the token.
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }
    const userId = user.id;

    // ─── Fetch the entry from DB ──────────────────────
    // We read the transcript from the database instead of
    // trusting whatever the client might send. This follows
    // the rule: "Never trust caller-supplied data."
    const { data: entry, error: fetchError } = await supabase
      .from('entries')
      .select('id, transcript, original_transcript, user_id')
      .eq('id', entry_id)
      .single();

    if (fetchError || !entry) {
      return new Response(
        JSON.stringify({ error: 'Entry not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // ─── Enforce ownership ────────────────────────────
    // Only the entry's author may process it — matches the
    // entries_update_own RLS policy (user_id = auth.uid()).
    if (entry.user_id !== userId) {
      return new Response(
        JSON.stringify({ error: 'Forbidden' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // ─── Fetch linked children's names ─────────────
    // If the parent tagged this entry with a child, we tell Claude
    // the correct spelling so it can fix speech-to-text errors
    // (e.g. "West" → "Wes"). Think of it like giving a proofreader
    // the cast list before they edit a script.
    const { data: linkedChildren } = await supabase
      .from('entry_children')
      .select('child_id, children(name, nickname)')
      .eq('entry_id', entry_id);

    const childNames = (linkedChildren ?? [])
      .map((ec: any) => {
        const c = ec.children;
        return c?.nickname || c?.name;
      })
      .filter(Boolean);

    // Skip if there's no transcript to process
    if (!entry.transcript?.trim()) {
      return new Response(
        JSON.stringify({ skipped: true, reason: 'Empty transcript' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // ─── Quality gate ───────────────────────────────
    // Skip AI processing if the transcript doesn't have enough
    // real words to be worth sending to Claude. Think of it like
    // a bouncer — if there's not enough content to work with,
    // don't waste the API call (~$0.002 each).
    //
    // We strip out common filler words (the same ones Claude
    // removes anyway) and check what's left. If fewer than 3
    // meaningful words remain, it's probably garbled speech-to-text
    // or a test recording — not a real memory.
    // Keep in sync with lib/textQuality.ts
    const FILLER_WORDS = new Set([
      'um', 'uh', 'uh-huh', 'like', 'you', 'know', 'so', 'basically',
      'mean', 'kind', 'of', 'sort', 'well', 'oh', 'yeah', 'ok', 'okay',
    ]);
    const meaningfulWords = entry.transcript
      .toLowerCase()
      .split(/\s+/)
      .filter((w: string) => w.length > 0 && !FILLER_WORDS.has(w.replace(/[^a-z]/g, '')));

    if (meaningfulWords.length < 3) {
      return new Response(
        JSON.stringify({ skipped: true, reason: 'Transcript too short for AI processing' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // ─── Fetch the tag taxonomy ───────────────────────
    // We send the list of available tags to Claude so it picks
    // from our taxonomy rather than inventing its own labels.
    const { data: systemTags } = await supabase
      .from('tags')
      .select('id, slug, name')
      .eq('source', 'system');

    const tagTaxonomy = (systemTags ?? []).map((t) => t.slug).join(', ');

    // ─── Call Claude Haiku ────────────────────────────
    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!anthropicKey) {
      return new Response(
        JSON.stringify({ error: 'Anthropic API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const childNameContext = childNames.length > 0
      ? `The parent has linked this entry to the following child(ren): ${childNames.join(', ')}. When a name in the transcript sounds similar to one of these names (e.g. "West" for "Wes", "Emma" for "M"), always use the correct spelling from this list.\n\n`
      : '';

    const systemPrompt = `${childNameContext}You are a family memory organizer. A parent just recorded a voice journal entry about their child. Return a JSON object with exactly these three fields:

1. "title": A short, warm title for this memory (maximum 8 words). Use the child's name if mentioned. Examples: "Emma's First Giggle", "Bath Time Chaos", "Dancing in the Rain". Do not wrap the title in quotes. If the transcript is garbled, incoherent, or doesn't describe a recognizable memory, set title to null.

2. "cleaned_transcript": The same transcript with any remaining filler words removed (um, uh, like, you know, so, basically, I mean, kind of, sort of) and obvious speech-to-text errors fixed.${childNames.length > 0 ? ' When fixing speech-to-text errors, correct any child name misspellings to match the known child names listed above.' : ''} Clean up extra spaces (the speech engine sometimes leaves gaps where it removed filler words). Capitalize the first word of every sentence. Ensure every sentence ends with appropriate punctuation. IMPORTANT: Preserve the parent's authentic voice and meaning. Do NOT rewrite, summarize, or paraphrase. Only remove filler and fix errors.

3. "tags": An array of objects, each with "slug" and "confidence" (0.0 to 1.0). Pick the most relevant tags from this taxonomy: [${tagTaxonomy}]. Maximum 3 tags. Only include tags with confidence >= 0.5.

Return ONLY valid JSON. No markdown, no explanation, no code fences.`;

    const response = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        system: systemPrompt,
        messages: [{ role: 'user', content: entry.transcript }],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Anthropic API error:', errorText);
      // Return 200 with success:false so the client can READ the error
      // (supabase.functions.invoke hides non-2xx response bodies)
      return new Response(
        JSON.stringify({ success: false, anthropic_status: response.status, detail: errorText }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const aiResponse = await response.json();
    let content = aiResponse.content?.[0]?.text;

    if (!content) {
      return new Response(
        JSON.stringify({ success: false, error: 'Empty AI response' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Strip markdown code fences if Claude wrapped the JSON in them.
    // LLMs sometimes return ```json { ... } ``` even when asked not to.
    content = content.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();

    // ─── Parse AI response ────────────────────────────
    let parsed: { title?: string; cleaned_transcript?: string; tags?: Array<{ slug: string; confidence: number }> };
    try {
      parsed = JSON.parse(content);
    } catch {
      console.error('Failed to parse AI response:', content);
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid AI response format', raw: content.slice(0, 200) }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // ─── Save results to DB ───────────────────────────
    const updates: Record<string, unknown> = {};

    // Title — cap at 60 chars for safety (8 words rarely exceeds this)
    if (parsed.title && typeof parsed.title === 'string') {
      updates.title = parsed.title.slice(0, 60);
    }

    // Cleaned transcript — preserve the original first
    if (parsed.cleaned_transcript && typeof parsed.cleaned_transcript === 'string') {
      // Only save original_transcript on the first AI processing run.
      // This makes the function idempotent — calling it again won't
      // overwrite the original with an already-cleaned version.
      if (!entry.original_transcript) {
        updates.original_transcript = entry.transcript;
      }
      updates.transcript = parsed.cleaned_transcript;
    }

    if (Object.keys(updates).length > 0) {
      const { error: updateError } = await supabase
        .from('entries')
        .update(updates)
        .eq('id', entry_id)
        .eq('user_id', userId);

      if (updateError) {
        console.error('Failed to update entry:', updateError);
        return new Response(
          JSON.stringify({ error: `Failed to save AI results: ${updateError.message}` }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }
    }

    // ─── Apply smart tags ─────────────────────────────
    // We do direct table operations instead of the refresh_auto_tags
    // RPC because the RPC checks auth.uid() — which is NULL when
    // called from an edge function using the service role key.
    //
    // Same logic as the RPC: delete auto-applied tags, then insert
    // new ones. Manual tags (auto_applied = false) are untouched.
    // ON CONFLICT DO NOTHING means if a tag was already manually
    // added by the parent, the AI's duplicate is silently skipped.
    let tagsApplied = 0;
    if (Array.isArray(parsed.tags) && parsed.tags.length > 0 && systemTags) {
      const autoTagIds: string[] = [];
      for (const aiTag of parsed.tags) {
        if (aiTag.confidence >= 0.5) {
          const match = systemTags.find((st) => st.slug === aiTag.slug);
          if (match) autoTagIds.push(match.id);
        }
      }

      if (autoTagIds.length > 0) {
        // Step 1: Remove existing auto-applied tags
        const { error: deleteError } = await supabase
          .from('entry_tags')
          .delete()
          .eq('entry_id', entry_id)
          .eq('auto_applied', true);

        if (deleteError) {
          console.warn('Failed to clear old auto tags:', deleteError);
        }

        // Step 2: Insert new AI tags (skip if they collide with manual ones)
        const rows = autoTagIds.map((tag_id) => ({
          entry_id,
          tag_id,
          auto_applied: true,
        }));
        const { error: insertError } = await supabase
          .from('entry_tags')
          .upsert(rows, { onConflict: 'entry_id,tag_id', ignoreDuplicates: true });

        if (insertError) {
          console.warn('Failed to apply AI tags:', insertError);
        } else {
          tagsApplied = autoTagIds.length;
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        title: updates.title ?? null,
        transcript_cleaned: 'transcript' in updates,
        cleaned_transcript: updates.transcript ?? null,
        tags_applied: tagsApplied,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('process-entry error:', err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
