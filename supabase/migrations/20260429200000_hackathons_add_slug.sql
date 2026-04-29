ALTER TABLE hackathons ADD COLUMN IF NOT EXISTS slug text;
CREATE UNIQUE INDEX IF NOT EXISTS hackathons_slug_key ON hackathons(slug);
