-- Migration 004: add custom_privileges column
-- Stores the selected privilege keys when privilege_template = 'custom'.
ALTER TABLE users
  ADD COLUMN custom_privileges JSON NULL AFTER privilege_template;
