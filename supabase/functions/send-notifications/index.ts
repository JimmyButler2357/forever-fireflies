// Send Notifications — Supabase Edge Function
//
// Called every minute by pg_cron. Think of it like a mailman who
// checks a schedule each minute: "Does anyone need a notification
// right now?" For each user whose notification_time matches the
// current time, it picks a personalized prompt with their child's
// name, sends it via Expo Push API, and logs it in notification_log.
//
// The function is idempotent — if called twice in the same minute,
// the second call finds no unserved users (they already have a log
// entry for today) and returns early.

import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

// ─── Helpers ──────────────────────────────────────────────

/** Calculate a child's age in months from their birthday. */
function ageInMonths(birthday: string): number {
  const born = new Date(birthday);
  const now = new Date();
  return (now.getFullYear() - born.getFullYear()) * 12
    + (now.getMonth() - born.getMonth());
}

/** Format a child's age as a human-readable string.
 *  Examples: "8 months", "18 months", "2 years", "3 years" */
function formatAge(months: number): string {
  if (months < 12) return `${months} month${months !== 1 ? 's' : ''}`;
  if (months < 24) return `${months} months`;
  const years = Math.floor(months / 12);
  return `${years} year${years !== 1 ? 's' : ''}`;
}

/** Pick a random element from an array. */
function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ─── Main handler ─────────────────────────────────────────

Deno.serve(async (_req) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const expoAccessToken = Deno.env.get('EXPO_ACCESS_TOKEN');

    // ─── Step 1: Find users who need a notification right now ──
    //
    // The client pre-computes `notification_time_utc` — the user's
    // chosen time converted to UTC. So all we need to do here is
    // ask: "whose notification_time_utc matches the current UTC slot?"
    //
    // Think of it like each house posting a "deliver at 01:30 UTC"
    // sign on their mailbox. The mailman only needs one clock (UTC)
    // and just reads signs that match.
    const now = new Date();
    const hours = now.getUTCHours();
    const minutes = now.getUTCMinutes() < 30 ? 0 : 30;
    const currentUtcSlot = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;

    // Day-of-week check uses UTC day. This is slightly off for users
    // near the date boundary (e.g. it's Tuesday night local but already
    // Wednesday UTC). Acceptable for MVP — notification_days is a
    // convenience feature, not a critical filter.
    const dayOfWeek = now.getUTCDay();

    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, notification_days')
      .eq('notification_enabled', true)
      .not('notification_time_utc', 'is', null)
      .like('notification_time_utc', `${currentUtcSlot}%`);

    if (profilesError) {
      console.error('Failed to query profiles:', profilesError);
      return jsonResponse({ success: false, error: profilesError.message });
    }

    if (!profiles || profiles.length === 0) {
      return jsonResponse({ success: true, sent: 0, reason: 'No profiles due at this time' });
    }

    // Filter by notification_days (which days of the week are enabled)
    const eligibleProfiles = profiles.filter((p) => {
      const days = p.notification_days as number[] | null;
      if (days && !days.includes(dayOfWeek)) return false;
      return true;
    });

    if (eligibleProfiles.length === 0) {
      return jsonResponse({ success: true, sent: 0, reason: 'No profiles due on this day' });
    }

    // ─── Step 2: Filter out users who already got one recently (dedup) ──
    //
    // Check "sent within the last 20 hours" to prevent double-sends.
    // (20 hours < 24 hours, so same-day is always caught.)
    const dedupeWindow = new Date(now.getTime() - 20 * 60 * 60 * 1000);
    const profileIds = eligibleProfiles.map((p) => p.id);

    const { data: recentLogs } = await supabase
      .from('notification_log')
      .select('profile_id')
      .in('profile_id', profileIds)
      .gte('sent_at', dedupeWindow.toISOString());

    const alreadySentIds = new Set((recentLogs ?? []).map((l) => l.profile_id));
    const toSend = eligibleProfiles.filter((p) => !alreadySentIds.has(p.id));

    if (toSend.length === 0) {
      return jsonResponse({ success: true, sent: 0, reason: 'All eligible users already notified recently' });
    }

    // ─── Step 3: Process each user ─────────────────────────
    let sentCount = 0;
    let skippedBackoff = 0;
    const errors: string[] = [];

    for (const profile of toSend) {
      try {
        // ── Backoff check ──
        // If the user has ignored the last 5 notifications in a row,
        // skip them today. Think of it like a polite friend who stops
        // knocking after getting no answer for a week.
        const { data: recentLogs } = await supabase
          .from('notification_log')
          .select('tapped')
          .eq('profile_id', profile.id)
          .order('sent_at', { ascending: false })
          .limit(5);

        if (recentLogs && recentLogs.length >= 5) {
          const allIgnored = recentLogs.every((l) => !l.tapped);
          if (allIgnored) {
            skippedBackoff++;
            continue;
          }
        }

        // ── Get the user's children ──
        // Follow the chain: profile → family_members → family_children → children
        const { data: familyMember } = await supabase
          .from('family_members')
          .select('family_id')
          .eq('profile_id', profile.id)
          .eq('status', 'active')
          .limit(1)
          .single();

        if (!familyMember) continue;

        const { data: familyChildren } = await supabase
          .from('family_children')
          .select('child_id, children(id, name, birthday)')
          .eq('family_id', familyMember.family_id);

        const children = (familyChildren ?? [])
          .map((fc: any) => fc.children)
          .filter(Boolean);

        if (children.length === 0) continue;

        // Pick a random child for tonight's notification
        const child = pickRandom(children);
        const childAgeMonths = ageInMonths(child.birthday);

        // ── Pick a prompt ──
        // Get prompts that match this child's age, excluding ones
        // this user has seen recently (last 10 prompt_history entries)
        const { data: recentPromptIds } = await supabase
          .from('prompt_history')
          .select('prompt_id')
          .eq('profile_id', profile.id)
          .order('shown_at', { ascending: false })
          .limit(10);

        const excludeIds = (recentPromptIds ?? []).map((r) => r.prompt_id);

        let promptQuery = supabase
          .from('prompts')
          .select('id, text')
          .eq('is_active', true);

        // Age-filter: include prompts where the child's age falls
        // within the min/max range, OR prompts with no age filter
        promptQuery = promptQuery.or(
          `min_age_months.is.null,min_age_months.lte.${childAgeMonths}`
        );
        promptQuery = promptQuery.or(
          `max_age_months.is.null,max_age_months.gte.${childAgeMonths}`
        );

        if (excludeIds.length > 0) {
          promptQuery = promptQuery.not('id', 'in', `(${excludeIds.join(',')})`);
        }

        const { data: prompts } = await promptQuery;

        // Fallback: if all prompts have been seen, just pick any active one
        let prompt;
        if (prompts && prompts.length > 0) {
          prompt = pickRandom(prompts);
        } else {
          const { data: fallback } = await supabase
            .from('prompts')
            .select('id, text')
            .eq('is_active', true)
            .limit(5);
          prompt = fallback && fallback.length > 0 ? pickRandom(fallback) : null;
        }

        if (!prompt) continue;

        // Replace {child_name} placeholder with the actual child's name
        const promptText = prompt.text.replace(/\{child_name\}/g, child.name);
        const subtitle = `${child.name} is ${formatAge(childAgeMonths)} old — these days go fast.`;

        // ── Log the notification FIRST ──
        // We log before sending so we have the log ID to include in
        // the push payload. If sending fails, the log entry with
        // tapped=false just looks like an ignored notification (harmless).
        const { data: logEntry, error: logError } = await supabase
          .from('notification_log')
          .insert({
            profile_id: profile.id,
            prompt_id: prompt.id,
            child_id: child.id,
            sent_at: new Date().toISOString(),
          })
          .select('id')
          .single();

        if (logError) {
          console.error(`Failed to log notification for ${profile.id}:`, logError);
          errors.push(`log:${profile.id}`);
          continue;
        }

        // Record the prompt as shown (prevents repeats)
        await supabase
          .from('prompt_history')
          .insert({
            profile_id: profile.id,
            prompt_id: prompt.id,
            context: 'notification',
          })
          .then(() => {}) // fire-and-forget
          .catch((err) => console.warn('prompt_history insert failed:', err));

        // ── Get push tokens for this user ──
        const { data: devices } = await supabase
          .from('user_devices')
          .select('push_token')
          .eq('profile_id', profile.id)
          .eq('is_active', true);

        if (!devices || devices.length === 0) continue;

        // ── Send via Expo Push API ──
        const messages = devices.map((d) => ({
          to: d.push_token,
          title: 'Forever Fireflies',
          body: promptText,
          subtitle, // iOS only — Android shows it differently
          sound: 'default',
          categoryId: 'daily-reminder',
          data: {
            notificationLogId: logEntry.id,
            childId: child.id,
            promptId: prompt.id,
          },
        }));

        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };
        if (expoAccessToken) {
          headers['Authorization'] = `Bearer ${expoAccessToken}`;
        }

        const pushResponse = await fetch(EXPO_PUSH_URL, {
          method: 'POST',
          headers,
          body: JSON.stringify(messages),
        });

        if (!pushResponse.ok) {
          const errorText = await pushResponse.text();
          console.error(`Expo Push API error for ${profile.id}:`, errorText);
          errors.push(`push:${profile.id}`);
          continue;
        }

        sentCount++;
      } catch (err) {
        console.error(`Error processing profile ${profile.id}:`, err);
        errors.push(`error:${profile.id}`);
      }
    }

    return jsonResponse({
      success: true,
      sent: sentCount,
      skipped_backoff: skippedBackoff,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (err) {
    console.error('send-notifications error:', err);
    return jsonResponse({ success: false, error: String(err) });
  }
});

// ─── Utility ──────────────────────────────────────────────

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
