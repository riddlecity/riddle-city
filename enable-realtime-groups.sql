-- Ensure the `groups` table is registered for Supabase Realtime (Postgres
-- logical replication). Enabling Row Level Security does NOT automatically
-- do this - it's a separate step, and if it's missing, the app's
-- `postgres_changes` subscription (used as a fallback/secondary sync path
-- alongside the broadcast-based instant sync) will silently never fire.
--
-- Run this in the Supabase SQL Editor. It's safe to run even if `groups` is
-- already part of the publication - the DO block below checks first.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'groups'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.groups;
  END IF;
END $$;

-- Verify: this should return a row for public.groups
SELECT schemaname, tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
ORDER BY tablename;
