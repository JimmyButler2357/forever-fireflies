-- Migration 038: expand_prompt_bank
--
-- 1. Update 4 existing prompts that feel slightly off-brand:
--    - "Describe..." is instructive → rewrite as open questions
--    - Yes/no questions → rewrite as open-ended
--    - Missing {child_name} → add it back for personalization
--
-- 2. Add 28 new prompts covering ages 3–15 (4 per age group):
--    3–4 yrs, 4–5 yrs, 5–7 yrs, 7–9 yrs, 9–11 yrs, 11–13 yrs, 13–15 yrs

-- ─── Part 1: Fix off-brand prompts ──────────────────────

UPDATE prompts
  SET text = 'How was {child_name} feeling today?'
  WHERE text = 'Describe {child_name}''s mood today in one sentence.';

UPDATE prompts
  SET text = 'How did {child_name} show kindness today?'
  WHERE text = 'Did {child_name} do something kind today?';

UPDATE prompts
  SET text = 'What happened today that you want to hold onto?'
  WHERE text = 'What is something you never want to forget about today?';

UPDATE prompts
  SET text = 'What small moment stood out today?'
  WHERE text = 'Describe a small moment you want to remember.';

-- ─── Part 2: New age-range prompts ──────────────────────

INSERT INTO prompts (text, min_age_months, max_age_months) VALUES

  -- 3–4 years (36–48 months)
  -- Imagination, silly words, early friendships, big feelings
  ('What made-up word did {child_name} use today?', 36, 48),
  ('Who did {child_name} play with today?', 36, 48),
  ('What silly thing did {child_name} do today?', 36, 48),
  ('What did {child_name} ask you to help with?', 36, 48),

  -- 4–5 years (48–60 months)
  -- Pre-K, growing independence, big questions, making things
  ('What big question did {child_name} ask today?', 48, 60),
  ('What did {child_name} build or make today?', 48, 60),
  ('What did {child_name} try to do without help?', 48, 60),
  ('What rule did {child_name} come up with today?', 48, 60),

  -- 5–7 years (60–84 months)
  -- Kindergarten, losing teeth, early reading, recess, bravery
  ('What did {child_name} learn to read or write today?', 60, 84),
  ('What happened at recess today?', 60, 84),
  ('What is {child_name} brave about right now?', 60, 84),
  ('What did {child_name} lose or find today?', 60, 84),

  -- 7–9 years (84–108 months)
  -- Elementary school, sports/activities, best friends, opinions
  ('What did {child_name} say about their friends today?', 84, 108),
  ('What is {child_name} getting better at?', 84, 108),
  ('What opinion did {child_name} share today?', 84, 108),
  ('What made {child_name} feel proud this week?', 84, 108),

  -- 9–11 years (108–132 months)
  -- Growing independence, hobbies, deeper thinking, surprising moments
  ('What is {child_name} into that you didn''t expect?', 108, 132),
  ('What did {child_name} handle on their own today?', 108, 132),
  ('What did {child_name} teach you recently?', 108, 132),
  ('What is {child_name} working through right now?', 108, 132),

  -- 11–13 years (132–156 months)
  -- Pre-teen, identity, social world, growing maturity
  ('What does {child_name} care about most right now?', 132, 156),
  ('When did {child_name} surprise you with how grown-up they are?', 132, 156),
  ('What did {child_name} and their friends talk about?', 132, 156),
  ('What is {child_name} figuring out about themselves?', 132, 156),

  -- 13–15 years (156–180 months)
  -- Teen years, big emotions, self-expression, independence
  ('What did {child_name} open up about recently?', 156, 180),
  ('What is {child_name} figuring out about the world?', 156, 180),
  ('What moment with {child_name} felt different this week?', 156, 180),
  ('What does {child_name} want you to understand about them?', 156, 180);
