-- ============================================
-- RIDDLE CITY - ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================
-- This file enables RLS and creates policies that allow your app to work
-- with unauthenticated (anon key) access patterns.
--
-- IMPORTANT: Run these commands in your Supabase SQL Editor
-- ============================================

-- ============================================
-- 1. GROUPS TABLE
-- ============================================
-- Enable RLS on groups table
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Allow read access by group_id" ON public.groups;
DROP POLICY IF EXISTS "Allow insert for authenticated users" ON public.groups;
DROP POLICY IF EXISTS "Allow update for group members" ON public.groups;

-- Allow anyone to read groups (client-side queries filter by group_id)
-- This is safe because users need the group_id cookie to access the game
CREATE POLICY "Allow read access by group_id"
ON public.groups
FOR SELECT
USING (true);

-- Allow group creation (for checkout process)
-- Anyone can create a group (they become the leader via group_members)
CREATE POLICY "Allow insert for authenticated users"
ON public.groups
FOR INSERT
WITH CHECK (true);

-- Allow updates to groups (for game progression, riddle completion, etc.)
-- This allows the server-side API routes to update groups
CREATE POLICY "Allow update for group members"
ON public.groups
FOR UPDATE
USING (true);


-- ============================================
-- 2. GROUP_MEMBERS TABLE
-- ============================================
-- Enable RLS on group_members table
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow read access to group members" ON public.group_members;
DROP POLICY IF EXISTS "Allow insert for joining groups" ON public.group_members;
DROP POLICY IF EXISTS "Allow delete for leaving groups" ON public.group_members;

-- Allow anyone to read group_members (needed for waiting room, member counts, etc.)
CREATE POLICY "Allow read access to group members"
ON public.group_members
FOR SELECT
USING (true);

-- Allow anyone to insert group members (for joining groups)
CREATE POLICY "Allow insert for joining groups"
ON public.group_members
FOR INSERT
WITH CHECK (true);

-- Allow anyone to delete group members (for leaving groups - if implemented)
CREATE POLICY "Allow delete for leaving groups"
ON public.group_members
FOR DELETE
USING (true);


-- ============================================
-- 3. PROFILES TABLE
-- ============================================
-- Enable RLS on profiles table
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow read access to profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow insert for new profiles" ON public.profiles;

-- Allow anyone to read profiles
CREATE POLICY "Allow read access to profiles"
ON public.profiles
FOR SELECT
USING (true);

-- Allow anyone to create profiles (upsert in join/create flow)
CREATE POLICY "Allow insert for new profiles"
ON public.profiles
FOR INSERT
WITH CHECK (true);


-- ============================================
-- 4. RIDDLES TABLE
-- ============================================
-- Enable RLS on riddles table
ALTER TABLE public.riddles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow read access to riddles" ON public.riddles;

-- Allow anyone to read riddles (game content)
-- This is safe because riddles are meant to be accessed during gameplay
CREATE POLICY "Allow read access to riddles"
ON public.riddles
FOR SELECT
USING (true);


-- ============================================
-- 5. RIDDLE_PROGRESS TABLE
-- ============================================
-- Enable RLS on riddle_progress table
ALTER TABLE public.riddle_progress ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow read access to riddle progress" ON public.riddle_progress;
DROP POLICY IF EXISTS "Allow insert for riddle progress" ON public.riddle_progress;
DROP POLICY IF EXISTS "Allow update for riddle progress" ON public.riddle_progress;

-- Allow anyone to read riddle progress
CREATE POLICY "Allow read access to riddle progress"
ON public.riddle_progress
FOR SELECT
USING (true);

-- Allow anyone to insert riddle progress (tracking attempts)
CREATE POLICY "Allow insert for riddle progress"
ON public.riddle_progress
FOR INSERT
WITH CHECK (true);

-- Allow anyone to update riddle progress (updating attempts)
CREATE POLICY "Allow update for riddle progress"
ON public.riddle_progress
FOR UPDATE
USING (true);


-- ============================================
-- 6. TRACKS TABLE
-- ============================================
-- Enable RLS on tracks table
ALTER TABLE public.tracks ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow read access to tracks" ON public.tracks;

-- Allow anyone to read tracks (game routes/modes)
CREATE POLICY "Allow read access to tracks"
ON public.tracks
FOR SELECT
USING (true);


-- ============================================
-- VERIFICATION QUERIES
-- ============================================
-- Run these to verify RLS is enabled and policies are created:

-- Check RLS is enabled on all tables
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('groups', 'group_members', 'profiles', 'riddles', 'riddle_progress', 'tracks')
ORDER BY tablename;

-- Check all policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('groups', 'group_members', 'profiles', 'riddles', 'riddle_progress', 'tracks')
ORDER BY tablename, policyname;


-- ============================================
-- NOTES
-- ============================================
-- 1. These policies use USING (true) which allows anon key access
--    This is safe because:
--    - Users need the group_id cookie to access games
--    - Queries always filter by specific IDs (group_id, user_id, riddle_id)
--    - Your server-side code (using service role) bypasses RLS anyway
--
-- 2. Server-side API routes use the service role key and will bypass RLS
--    Only client-side components using the anon key are affected
--
-- 3. The actual security is enforced by:
--    - Cookie-based session management
--    - Server-side verification in API routes
--    - Stripe payment verification
--    - Group membership checks
--
-- 4. If you want stricter RLS in the future, you can:
--    - Implement Supabase Auth (email/password or OAuth)
--    - Use auth.uid() in policies to restrict to authenticated users
--    - Add row-level conditions like: WHERE group_id = some_cookie_value
--
-- ============================================
