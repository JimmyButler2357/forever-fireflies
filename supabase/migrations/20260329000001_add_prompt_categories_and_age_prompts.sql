-- Migration: add_prompt_categories_and_age_prompts
--
-- 1. Add a "category" column to the prompts table so users can
--    browse by theme (Everyday, Milestones, Funny, Feelings, Firsts).
-- 2. Backfill existing ~50 prompts with best-guess categories.
-- 3. Insert ~25 new prompts focused on the 0–7yr range, which is
--    currently sparse. Each tagged with a theme category.

-- ─── Part 1: Add category column with CHECK constraint ──────────

ALTER TABLE prompts
  ADD COLUMN category text NOT NULL DEFAULT 'everyday'
  CONSTRAINT prompts_category_check
  CHECK (category IN ('everyday', 'milestones', 'funny', 'feelings', 'firsts'));

-- ─── Part 2: Backfill existing prompts with categories ──────────
-- Everything defaults to 'everyday', so we only UPDATE the ones
-- that belong to a different theme.

-- Funny
UPDATE prompts SET category = 'funny'
  WHERE text IN (
    'What made {child_name} laugh today?',
    'What did {child_name} eat today that was funny or unexpected?',
    'What silly thing did {child_name} do today?',
    'What made-up word did {child_name} use today?',
    'What rule did {child_name} come up with today?'
  );

-- Milestones
UPDATE prompts SET category = 'milestones'
  WHERE text IN (
    'What milestone is {child_name} working toward?',
    'What did {child_name} try to do independently today?',
    'What new word did {child_name} try to say?',
    'What did {child_name} learn to read or write today?',
    'What is {child_name} getting better at?',
    'What did {child_name} handle on their own today?',
    'What did {child_name} try to do without help?'
  );

-- Feelings
UPDATE prompts SET category = 'feelings'
  WHERE text IN (
    'How was {child_name} feeling today?',
    'How did {child_name} show love today?',
    'How did {child_name} show kindness today?',
    'What made you proud of {child_name} today?',
    'What is {child_name} brave about right now?',
    'What is {child_name} working through right now?',
    'What does {child_name} care about most right now?',
    'What is {child_name} figuring out about themselves?',
    'What did {child_name} open up about recently?'
  );

-- Firsts
UPDATE prompts SET category = 'firsts'
  WHERE text IN (
    'What new sound is {child_name} making?',
    'How did {child_name} react to something new today?',
    'What is something {child_name} said that surprised you?',
    'What is {child_name} into that you didn''t expect?',
    'What did {child_name} lose or find today?',
    'When did {child_name} surprise you with how grown-up they are?'
  );

-- Everything else stays 'everyday' (the default).

-- ─── Part 3: New age-specific prompts (0–7yr focus) ────────────
-- Filling the gap where we had very few prompts.
-- All use {child_name} placeholder. Brand voice: quiet, warm, real.

INSERT INTO prompts (text, min_age_months, max_age_months, category) VALUES

  -- Newborn (0–6 months)
  ('What expression did {child_name} make today that you want to remember?', 0, 6, 'everyday'),
  ('How did {child_name} react to your voice today?', 0, 6, 'firsts'),
  ('What was feeding time like with {child_name} today?', 0, 6, 'everyday'),
  ('What new thing did {child_name} notice today?', 0, 6, 'firsts'),

  -- Baby (6–12 months)
  ('What did {child_name} reach for today?', 6, 12, 'milestones'),
  ('What food did {child_name} try for the first time?', 6, 12, 'firsts'),
  ('What sound is {child_name} practicing right now?', 6, 12, 'milestones'),
  ('What made {child_name} giggle today?', 6, 12, 'funny'),

  -- Young Toddler (12–24 months)
  ('What did {child_name} point at today?', 12, 24, 'everyday'),
  ('What word is {child_name} trying to say?', 12, 24, 'milestones'),
  ('What did {child_name} do that made you stop and watch?', 12, 24, 'feelings'),
  ('Where did {child_name} want to explore today?', 12, 24, 'everyday'),

  -- Older Toddler (24–36 months)
  ('What did {child_name} pretend today?', 24, 36, 'funny'),
  ('What opinion did {child_name} have today?', 24, 36, 'feelings'),
  ('Who did {child_name} want to play with today?', 24, 36, 'everyday'),
  ('What sentence did {child_name} put together today?', 24, 36, 'milestones'),

  -- Early Preschool (36–48 months)
  ('What question did {child_name} ask that stopped you in your tracks?', 36, 48, 'funny'),
  ('What is {child_name} afraid of right now?', 36, 48, 'feelings'),
  ('What world did {child_name} make up today?', 36, 48, 'everyday'),

  -- Late Preschool (48–60 months)
  ('What is {child_name} most excited about learning?', 48, 60, 'milestones'),
  ('What did {child_name} do all by themselves today?', 48, 60, 'milestones'),
  ('What did {child_name} make up a story about?', 48, 60, 'everyday'),

  -- Kindergarten (60–84 months)
  ('What did {child_name} tell you about their day?', 60, 84, 'everyday'),
  ('What is {child_name} proud of this week?', 60, 84, 'feelings'),
  ('What new friendship is {child_name} building?', 60, 84, 'firsts');
