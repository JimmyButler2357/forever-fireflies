ALTER TABLE children
  DROP CONSTRAINT children_color_index_check,
  ADD CONSTRAINT children_color_index_check
    CHECK (color_index >= 0 AND color_index <= 9);
