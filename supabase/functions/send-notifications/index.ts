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

// VERBOSE_LOGS=1 turns on the diagnostic logs that fire EVERY cron tick
// (current UTC, gate counts, etc.). Off by default in prod because the
// cron runs every minute = 1,440 runs/day; the noise piles up in
// Supabase's log retention quota fast (review fix #10).
//
// Always-on logs: errors, per-user SKIPPED reasons, the final [RESULT]
// summary. Anything diagnostic/redundant is wrapped in debug() below.
const VERBOSE = Deno.env.get('VERBOSE_LOGS') === '1';
function debug(...args: unknown[]) {
  if (VERBOSE) console.log(...args);
}

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

/** Day-of-week (0=Sun … 6=Sat) for a given Date, evaluated in the supplied
 *  IANA timezone instead of the runtime's UTC.
 *
 *  ELI5: JavaScript's getDay() asks "what day is it where THIS server is?"
 *  Our server lives in UTC, but a parent in EST who set "Mon–Fri" thinks
 *  in their own clock. So at 11pm Friday EST (= 04:00 Saturday UTC) the
 *  user expects a notification — but UTC says Saturday and we'd skip them.
 *  Intl.DateTimeFormat lets us ask "what day is it for that user's clock?"
 *  and answer with their truth, not ours. */
function getDayOfWeekInTimezone(date: Date, timezone: string): number {
  const dayName = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    weekday: 'long',
  }).format(date);
  const map: Record<string, number> = {
    Sunday: 0, Monday: 1, Tuesday: 2, Wednesday: 3,
    Thursday: 4, Friday: 5, Saturday: 6,
  };
  return map[dayName] ?? date.getUTCDay(); // safe fallback if Intl errors
}

// ─── Main handler ─────────────────────────────────────────

Deno.serve(async (req) => {
  // Bearer-token gate: only pg_cron may invoke this. verify_jwt = false in
  // config.toml lets pg_cron through without a user JWT (it has no user
  // identity), but without this manual check anyone with the URL could
  // trigger notification spam, burn function quota, and damage Expo sender
  // reputation. pg_cron sends Bearer <service_role_key> per migration
  // 20260428000002 (security audit 2-B).
  const expectedToken = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!expectedToken || req.headers.get('Authorization') !== `Bearer ${expectedToken}`) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      expectedToken,
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

    // Exact match on the current UTC minute. Notification times are
    // stored on 5-minute increments (e.g. "02:45:00") and the cron
    // runs every minute, so we just check: "does anyone's time match
    // this exact minute?" One match = one notification.
    debug('[DEBUG] Current UTC:', currentUtcTime);

    // Pull timezone too — needed for the per-profile day-of-week check
    // below. notification_days is meant to be evaluated in the user's
    // LOCAL day, not UTC (review fix #8). A user in EST who ticks
    // "Mon–Fri" expects to be notified Friday at 9pm even though UTC
    // already rolled over to Saturday.
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, notification_days, timezone')
      .eq('notification_enabled', true)
      .not('notification_time_utc', 'is', null)
      .eq('notification_time_utc', currentUtcTime);

    if (profilesError) {
      console.error('Failed to query profiles:', profilesError);
      return jsonResponse({ success: false, error: profilesError.message });
    }

    if (!profiles || profiles.length === 0) {
      debug('[GATE 1] No profiles matched the time window. Stopping.');
      return jsonResponse({ success: true, sent: 0, reason: 'No profiles due at this time' });
    }

    debug(`[GATE 1] ${profiles.length} profile(s) matched time window:`, profiles.map((p) => p.id));

    // Filter by notification_days (which days of the week are enabled),
    // computing each user's local day-of-week from their timezone.
    // Users without a timezone set fall back to UTC (matches old behavior).
    const eligibleProfiles = profiles.filter((p) => {
      const days = p.notification_days as number[] | null;
      if (!days) return true; // null = "all days" by convention
      const tz = (p.timezone as string | null) ?? 'UTC';
      const localDay = getDayOfWeekInTimezone(now, tz);
      if (!days.includes(localDay)) {
        debug(`[GATE 2] Profile ${p.id} skipped — local day ${localDay} (${tz}) not in their allowed days:`, days);
        return false;
      }
      return true;
    });

    if (eligibleProfiles.length === 0) {
      debug('[GATE 2] All profiles filtered out by day-of-week check.');
      return jsonResponse({ success: true, sent: 0, reason: 'No profiles due on this day' });
    }

    debug(`[GATE 2] ${eligibleProfiles.length} profile(s) passed day-of-week check.`);

    // ─── Step 2: Process eligible profiles ─────────────────
    // Per-profile dedup + backoff checks happen inside the loop below.
    // Doing the DB lookup per-profile keeps the code readable; the
    // eligibleProfiles set is normally small (everyone with the same
    // exact-minute notification_time_utc), so the cost is negligible.
    const toSend = eligibleProfiles;

    // ─── Step 3: Process each user ─────────────────────────
    let sentCount = 0;
    const errors: string[] = [];

    for (const profile of toSend) {
      try {
        console.log(`[USER ${profile.id}] ── Starting processing ──`);

        // ── Dedup + backoff (one DB call covers both) ──
        //
        // Pull the user's last 5 SUCCESSFUL notifications and use them for:
        //   1. Dedup: did we already send something in the last 22 hours?
        //      One push per user per day. 22h (not 24h) gives a small
        //      cushion for users who shift their notification time slightly
        //      without falsely blocking a legit send.
        //   2. Backoff: were the last 5 notifications ALL ignored (no tap)?
        //      If so, pause sending until the user re-engages. This breaks
        //      the "ignored → another → ignored" doom loop that drives
        //      uninstalls. Any tap in the last 5 = sending resumes.
        //
        // We filter delivery_status='sent' so failed pushes don't poison
        // the dedup window (review fix #5). 'pending' rows are excluded
        // too — they're either still in flight (we'll catch the duplicate
        // via row-level uniqueness on the next iteration) or were
        // abandoned by a previous crash.
        const { data: recentLog, error: recentLogErr } = await supabase
          .from('notification_log')
          .select('sent_at, tapped')
          .eq('profile_id', profile.id)
          .eq('delivery_status', 'sent')
          .order('sent_at', { ascending: false })
          .limit(5);

        if (recentLogErr) {
          console.warn(`[USER ${profile.id}] WARN — could not check notification history; sending anyway:`, recentLogErr.message);
        } else {
          // Dedup window
          const dedupCutoffMs = Date.now() - 22 * 60 * 60 * 1000;
          const recentSend = recentLog?.find((r) => new Date(r.sent_at).getTime() > dedupCutoffMs);
          if (recentSend) {
            console.log(`[USER ${profile.id}] SKIPPED — dedup: last send was ${recentSend.sent_at} (inside 22h window)`);
            continue;
          }
          // Backoff: only fires once the user has 5+ history entries.
          // every(!tapped) means none of the last 5 were tapped.
          if (recentLog && recentLog.length >= 5 && recentLog.every((r) => !r.tapped)) {
            console.log(`[USER ${profile.id}] SKIPPED — backoff: last 5 notifications all ignored`);
            continue;
          }
        }

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

        // Log only the count, never the tokens themselves — even partial
        // tokens uniquely identify a device (review fix #9, PII concern).
        console.log(`[USER ${profile.id}] Found ${devices.length} active device(s)`);

        // ── Log the notification ──
        // We log before sending so we have the log ID to include in
        // the push payload (for tap tracking). prompt_id and child_id
        // are null since we use generic messages now.
        //
        // The row goes in with delivery_status='pending' (Postgres default
        // from the column definition). We flip it to 'sent' or 'failed'
        // below depending on the Expo Push response. The dedup query above
        // filters out 'pending' / 'failed' rows so they don't block legit
        // future sends.
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
          collapseId: 'daily-prompt',
          tag: 'daily-prompt',
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
          // Mark the log row as failed so dedup ignores it tomorrow.
          // We swallow this update's error — there's nothing useful to do
          // if it fails, and the user-facing problem (no push) is already
          // logged above.
          await supabase
            .from('notification_log')
            .update({ delivery_status: 'failed' })
            .eq('id', logEntry.id);
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

        // Push succeeded — promote the row from 'pending' to 'sent' so it
        // counts toward dedup tomorrow. Per-ticket errors above are still
        // logged for diagnostic purposes; if EVERY ticket was an error
        // we'd technically want 'failed', but that's a sub-bug worth
        // tackling separately (most multi-device cases have at least one
        // good token).
        const { error: markSentErr } = await supabase
          .from('notification_log')
          .update({ delivery_status: 'sent' })
          .eq('id', logEntry.id);
        if (markSentErr) {
          console.warn(`[USER ${profile.id}] WARN — push succeeded but could not mark log as 'sent':`, markSentErr.message);
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
