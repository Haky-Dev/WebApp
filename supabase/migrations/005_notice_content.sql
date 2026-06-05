-- supabase/migrations/005_notice_content.sql
ALTER TABLE events ADD COLUMN IF NOT EXISTS notice_content jsonb DEFAULT NULL;
