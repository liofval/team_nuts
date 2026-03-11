-- Migration: add tags and press_release_tags tables and document_tsv
BEGIN;

-- tags table
CREATE TABLE IF NOT EXISTS tags (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL DEFAULT 'tag',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- press_release_tags
CREATE TABLE IF NOT EXISTS press_release_tags (
  press_release_id BIGINT NOT NULL,
  tag_id BIGINT NOT NULL,
  PRIMARY KEY (press_release_id, tag_id)
);

-- add columns to press_releases if not exists
ALTER TABLE press_releases
  ADD COLUMN IF NOT EXISTS main_image_url TEXT,
  ADD COLUMN IF NOT EXISTS excerpt TEXT,
  ADD COLUMN IF NOT EXISTS document_tsv tsvector;

-- indexes
CREATE INDEX IF NOT EXISTS idx_press_releases_document_tsv ON press_releases USING GIN (document_tsv);
-- pg_trgm extension is needed for fast partial match on tags.name
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS idx_tags_name_trgm ON tags USING GIN (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_prt_tag_id ON press_release_tags (tag_id);
CREATE INDEX IF NOT EXISTS idx_prt_press_release_id ON press_release_tags (press_release_id);

COMMIT;
