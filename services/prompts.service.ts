// Prompts service — fetch conversation starters for the recording screen
// and notifications. Tracks which prompts the user has seen so we don't
// repeat the same one too often (like a playlist on shuffle).

import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/lib/database.types';

type Prompt = Database['public']['Tables']['prompts']['Row'];
type CachedPrompt = Pick<Prompt, 'id' | 'text'>;

const DAILY_PROMPTS_KEY = 'daily_prompts';

interface DailyPromptsCache {
  date: string;
  childId: string | null; // which child this cache entry is for
  prompts: CachedPrompt[];
}

/** Pick today's featured child by rotating through the list.
 *  Uses day-number math so the result is deterministic — reopening
 *  the app always shows the same child all day, like taking turns
 *  at a board game. Day 1 = kid 0, Day 2 = kid 1, etc., then wraps. */
function getTodaysChildIndex(childCount: number): number {
  if (childCount <= 1) return 0;
  const epoch = new Date(2026, 0, 1).getTime();
  const dayNumber = Math.floor((Date.now() - epoch) / 86_400_000);
  return dayNumber % childCount;
}

/** Get today's date as YYYY-MM-DD in the user's local timezone.
 *  Using local time (not UTC) so the cache key matches the user's
 *  calendar day — otherwise a user at 11 PM would get a cache miss
 *  because UTC has already rolled over to tomorrow. */
function getLocalToday(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export { getTodaysChildIndex };

export const promptsService = {
  /** Get multiple unique prompts in one batch. Hits the database twice:
   *  once for recently-shown history, once for candidates. Shuffles
   *  candidates and returns `count` unique prompts.
   *
   *  Think of it like going to the store once and buying 3 items,
   *  instead of making 3 separate trips for each item. */
  async getNextPrompts(
    profileId: string,
    count: number,
    childAgeMonths?: number,
    category?: string,
    universalOnly?: boolean,
  ): Promise<Prompt[]> {
    // 1. Fetch recently shown prompt IDs (last 10) — 1 DB call
    const { data: recentHistory, error: historyError } = await supabase
      .from('prompt_history')
      .select('prompt_id')
      .eq('profile_id', profileId)
      .order('shown_at', { ascending: false })
      .limit(10);

    if (historyError) {
      throw new Error(
        `Failed to fetch prompt history: ${historyError.message}`,
        { cause: historyError },
      );
    }

    const recentIds = recentHistory?.map((h) => h.prompt_id) ?? [];

    // 2. Fetch candidates (excluding recent ones) — 1 DB call
    let query = supabase
      .from('prompts')
      .select('*')
      .eq('is_active', true);

    if (childAgeMonths !== undefined) {
      query = query
        .or(`min_age_months.is.null,min_age_months.lte.${childAgeMonths}`)
        .or(`max_age_months.is.null,max_age_months.gte.${childAgeMonths}`);
    }

    // Universal-only: return prompts with no age range (for "All" child tab)
    if (universalOnly) {
      query = query.is('min_age_months', null);
    }

    // Category filter: narrow to a specific theme
    if (category && category !== 'all') {
      query = query.eq('category', category);
    }

    if (recentIds.length > 0) {
      query = query.not('id', 'in', `(${recentIds.join(',')})`);
    }

    const fetchLimit = Math.max(count * 3, 10);
    const { data: candidates, error } = await query.limit(fetchLimit);

    if (error) {
      throw new Error(
        `Failed to fetch prompts: ${error.message}`,
        { cause: error },
      );
    }

    let pool = candidates ?? [];

    // If not enough candidates (all were recently shown), fall back
    // to the full active pool — better to repeat than show nothing.
    if (pool.length < count) {
      let fallbackQuery = supabase
        .from('prompts')
        .select('*')
        .eq('is_active', true);

      if (universalOnly) {
        fallbackQuery = fallbackQuery.is('min_age_months', null);
      }
      if (category && category !== 'all') {
        fallbackQuery = fallbackQuery.eq('category', category);
      }

      const { data: fallbackPool, error: fallbackError } = await fallbackQuery
        .limit(fetchLimit);

      if (!fallbackError && fallbackPool && fallbackPool.length > 0) {
        pool = fallbackPool;
      }
    }

    // Shuffle using Fisher-Yates, then take the first `count`.
    // Fisher-Yates is like dealing cards from a shuffled deck —
    // each item has an equal chance of landing in any position.
    const shuffled = [...pool];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    return shuffled.slice(0, count);
  },

  /** Get a prompt for today, cached per child in AsyncStorage so it's
   *  instant after the first load. Think of it like a "daily special"
   *  menu — the kitchen preps it once in the morning, then serves it
   *  instantly to every customer that day. Next day, new specials.
   *
   *  The cache includes the featured child's ID so that different
   *  children get age-appropriate prompts (a 2-year-old and a
   *  12-year-old shouldn't see the same question).
   *
   *  Returns raw prompt text with {child_name} placeholder intact —
   *  the caller substitutes real names at render time so renames
   *  take effect immediately without clearing the cache. */
  async getDailyPrompts(
    profileId: string,
    count: number,
    childAgeMonths?: number,
    childId?: string,
  ): Promise<CachedPrompt[]> {
    const today = getLocalToday();

    // 1. Try cache first (~5-20ms, local disk)
    try {
      const raw = await AsyncStorage.getItem(DAILY_PROMPTS_KEY);
      if (raw) {
        const cache: DailyPromptsCache = JSON.parse(raw);
        if (
          cache.date === today &&
          cache.childId === (childId ?? null) &&
          cache.prompts.length > 0
        ) {
          return cache.prompts;
        }
      }
    } catch {
      // Cache read failed — fall through to network
    }

    // 2. Cache miss — fetch from Supabase (batch method, 2 DB calls)
    const fetched = await this.getNextPrompts(profileId, count, childAgeMonths);
    const result: CachedPrompt[] = fetched.map((p) => ({ id: p.id, text: p.text }));

    // 3. Save to cache for today + child (fire-and-forget)
    AsyncStorage.setItem(
      DAILY_PROMPTS_KEY,
      JSON.stringify({ date: today, childId: childId ?? null, prompts: result }),
    ).catch(() => {});

    // 4. Record shown in prompt_history — single batch insert instead
    //    of 3 separate calls (fire-and-forget, only on cache miss)
    if (result.length > 0) {
      supabase
        .from('prompt_history')
        .insert(
          result.map((p) => ({
            profile_id: profileId,
            prompt_id: p.id,
            context: 'recording_screen' as const,
          })),
        )
        .then(({ error }) => {
          if (error) console.warn('Failed to record prompts shown:', error.message);
        });
    }

    return result;
  },

  /** Record that a prompt was shown to the user */
  async recordPromptShown(profileId: string, promptId: string, context: 'recording_screen' | 'notification') {
    const { error } = await supabase
      .from('prompt_history')
      .insert({
        profile_id: profileId,
        prompt_id: promptId,
        context,
      });

    if (error) throw new Error(`Failed to record prompt shown: ${error.message}`, { cause: error });
  },
};
