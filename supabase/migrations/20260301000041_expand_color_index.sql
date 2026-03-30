-- Expand color_index CHECK constraint from 6 colors (0-5) to 10 colors (0-9).
-- The frontend childColors palette already defines 10 colors; this migration
-- brings the database constraint into alignment.

ALTER TABLE children
  DROP CONSTRAINT children_color_index_check,
  ADD CONSTRAINT children_color_index_check
    CHECK (color_index >= 0 AND color_index <= 9);
