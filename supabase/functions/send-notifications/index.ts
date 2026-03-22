// Send Notifications — Supabase Edge Function
//
// Called every minute by pg_cron. Think of it like a mailman who
// checks a schedule each minute: "Does anyone need a notification
// right now?" For each eligible user, it picks a generic gentle
// nudge and sends it via Expo Push API, then logs it in
// notification_log.
//
// Notifications are intentionally generic — no child names, no age
// references. This keeps the logic simple (no child/prompt table
// lookups) and matches the brand voice: quiet invitations, not
// personalized reminders.
//
// Heavy logging is enabled so every decision point is visible in
// the Supabase function logs and in the HTTP response.

import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

// ─── Notification Messages ───────────────────────────────
//
// 5 generic, brand-voice-aligned nudges. No child names, no
// exclamation points, no guilt. Each one is an invitation —
// like a quiet tap on the shoulder at the end of the day.
// All under 60 characters so they fit on a lock screen.

const NOTIFICATION_MESSAGES = [
  'Before today fades — what\u2019s one moment worth keeping?',
  'What happened today that made you smile?',
  'Anything worth remembering from today?',
  'What\u2019s one thing you don\u2019t want to forget?',
  'What moment from today would you tell a friend about?',
];

// ─── Helpers ──────────────────────────────────────────────

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
    const minutes = now.getUTCMinutes();
    // Build "HH:MM" for the current UTC minute
    const currentUtcTime = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`;

    // Day-of-week check uses UTC day. This is slightly off for users
    // near the date boundary (e.g. it's Tuesday night local but already
    // Wednesday UTC). Acceptable for MVP — notification_days is a
    // convenience feature, not a critical filter.
    const dayOfWeek = now.getUTCDay();

    // Exact match on the current UTC minute. Notification times are
    // stored on 5-minute increments (e.g. "02:45:00") and the cron
    // runs every minute, so we just check: "does anyone's time match
    // this exact minute?" One match = one notification. No window,
    // no dedup needed.
    console.log('[DEBUG] Current UTC:', currentUtcTime);

    // Debug: check what profiles exist with notifications enabled
    const { data: debugProfiles } = await supabase
      .from('profiles')
      .select('id, notification_enabled, notification_time_utc, timezone')
      .eq('notification_enabled', true);
    console.log('[DEBUG] All enabled profiles:', JSON.stringify(debugProfiles));

    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, notification_days')
      .eq('notification_enabled', true)
      .not('notification_time_utc', 'is', null)
      .eq('notification_time_utc', currentUtcTime);

    if (profilesError) {
      console.error('Failed to query profiles:', profilesError);
      return jsonResponse({ success: false, error: profilesError.message });
    }

    if (!profiles || profiles.length === 0) {
      console.log('[GATE 1] No profiles matched the time window. Stopping.');
      return jsonResponse({ success: true, sent: 0, reason: 'No profiles due at this time' });
    }

    console.log(`[GATE 1] ${profiles.length} profile(s) matched time window:`, profiles.map((p) => p.id));

    // Filter by notification_days (which days of the week are enabled)
    const eligibleProfiles = profiles.filter((p) => {
      const days = p.notification_days as number[] | null;
      if (days && !days.includes(dayOfWeek)) {
        console.log(`[GATE 2] Profile ${p.id} skipped — day ${dayOfWeek} not in their allowed days:`, days);
        return false;
      }
      return true;
    });

    if (eligibleProfiles.length === 0) {
      console.log('[GATE 2] All profiles filtered out by day-of-week check.');
      return jsonResponse({ success: true, sent: 0, reason: 'No profiles due on this day' });
    }

    console.log(`[GATE 2] ${eligibleProfiles.length} profile(s) passed day-of-week check.`);

    // ─── Step 2: Dedup disabled for testing ────────────────
    // TODO: Re-enable dedup before production launch. A 10-minute
    // window should be enough to prevent the ±2 min time window
    // from sending duplicates while still allowing easy re-testing.
    const toSend = eligibleProfiles;

    // ─── Step 3: Process each user ─────────────────────────
    let sentCount = 0;
    const errors: string[] = [];

    for (const profile of toSend) {
      try {
        console.log(`[USER ${profile.id}] ── Starting processing ──`);

        // TODO: Re-enable backoff before production launch.
        // Backoff skips users who ignored the last 5 notifications in a row.
        // Disabled during testing so notifications always come through.

        // ── Pick a generic message ──
        const messageBody = pickRandom(NOTIFICATION_MESSAGES);
        console.log(`[USER ${profile.id}] Message selected: "${messageBody}"`);

        // ── Get push tokens for this user ──
        // Check for tokens BEFORE logging, so we don't create a log
        // entry for a user who has no device to receive it.
        const { data: devices } = await supabase
          .from('user_devices')
          .select('push_token')
          .eq('profile_id', profile.id)
          .eq('is_active', true);

        if (!devices || devices.length === 0) {
          console.log(`[USER ${profile.id}] SKIPPED — no active push tokens found in user_devices.`);
          continue;
        }

        console.log(`[USER ${profile.id}] Found ${devices.length} device(s) with tokens:`, devices.map((d) => d.push_token.substring(0, 30) + '...'));

        // ── Log the notification ──
        // We log before sending so we have the log ID to include in
        // the push payload (for tap tracking). prompt_id and child_id
        // are null since we use generic messages now.
        const { data: logEntry, error: logError } = await supabase
          .from('notification_log')
          .insert({
            profile_id: profile.id,
            sent_at: new Date().toISOString(),
          })
          .select('id')
          .single();

        if (logError) {
          console.error(`[USER ${profile.id}] FAILED — could not create notification_log entry:`, logError);
          errors.push(`log:${profile.id}`);
          continue;
        }

        console.log(`[USER ${profile.id}] Log entry created: ${logEntry.id}`);

        // ── Send via Expo Push API ──
        const messages = devices.map((d) => ({
          to: d.push_token,
          title: 'Forever Fireflies',
          body: messageBody,
          sound: 'default',
          categoryId: 'daily-reminder',
          data: {
            notificationLogId: logEntry.id,
          },
        }));

        console.log(`[USER ${profile.id}] Sending to Expo Push API — ${messages.length} message(s)...`);

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

        // Read the full Expo response so we can see ticket IDs or errors
        const pushBody = await pushResponse.text();
        console.log(`[USER ${profile.id}] Expo Push API response (${pushResponse.status}):`, pushBody);

        if (!pushResponse.ok) {
          console.error(`[USER ${profile.id}] FAILED — Expo Push API returned ${pushResponse.status}`);
          errors.push(`push:${profile.id}`);
          continue;
        }

        // Parse Expo's response to check for per-token errors
        // (e.g. "DeviceNotRegistered" means the token is stale)
        try {
          const pushResult = JSON.parse(pushBody);
          if (pushResult.data) {
            for (const ticket of pushResult.data) {
              if (ticket.status === 'error') {
                console.error(`[USER ${profile.id}] Expo ticket error:`, ticket.message, ticket.details);
              } else {
                console.log(`[USER ${profile.id}] Expo ticket OK — id: ${ticket.id}`);
              }
            }
          }
        } catch {
          // Non-JSON response, already logged above
        }

        console.log(`[USER ${profile.id}] Notification sent.`);
        sentCount++;
      } catch (err) {
        console.error(`[USER ${profile.id}] FAILED — unexpected error:`, err);
        errors.push(`error:${profile.id}`);
      }
    }

    const summary = {
      success: true,
      sent: sentCount,
      total_eligible: toSend.length,
      errors: errors.length > 0 ? errors : undefined,
      debug: {
        current_utc: currentUtcTime,
        day_of_week: dayOfWeek,
        profiles_matched_time: profiles.length,
        profiles_after_day_filter: eligibleProfiles.length,
      },
    };
    console.log('[RESULT]', JSON.stringify(summary));
    return jsonResponse(summary);
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
