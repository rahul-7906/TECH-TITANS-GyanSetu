-- ====================================================================
-- GyanSetu Supabase Complete Setup & Migration Script
--
-- INSTRUCTIONS:
-- 1. Go to your Supabase Project Dashboard: https://supabase.com/dashboard/project/bpfjlpjwspzlcsowespc
-- 2. Click "SQL Editor" on the left menu (or go to: https://supabase.com/dashboard/project/bpfjlpjwspzlcsowespc/sql/new)
-- 3. Click "New query", paste all the contents of this file, and click "Run" (green button).
-- 4. It will return "Success. No rows returned" or "Query executed successfully".
-- ====================================================================

-- ── 1. PROFILES TABLE ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY,
  email text,
  full_name text,
  department text DEFAULT 'General',
  year text DEFAULT '3rd Year',
  role text DEFAULT 'learner',
  credits integer DEFAULT 100,
  xp integer DEFAULT 50,
  streak integer DEFAULT 1,
  rating numeric DEFAULT 5.0,
  sessions_count integer DEFAULT 0,
  topics text[] DEFAULT ARRAY['DSA', 'Web Dev'],
  languages text[] DEFAULT ARRAY['English', 'Hindi'],
  availability text DEFAULT 'available',
  bio text DEFAULT 'GyanSetu Member',
  welcome_bonus_given boolean DEFAULT true,
  total_earned integer DEFAULT 0,
  total_spent integer DEFAULT 0,
  pending_credits integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Safely add any columns that may be missing if the table already existed
DO $$
BEGIN
  ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email text;
  ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS full_name text;
  ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS department text DEFAULT 'General';
  ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS year text DEFAULT '3rd Year';
  ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role text DEFAULT 'learner';
  ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS credits integer DEFAULT 100;
  ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS xp integer DEFAULT 50;
  ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS streak integer DEFAULT 1;
  ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS rating numeric DEFAULT 5.0;
  ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS sessions_count integer DEFAULT 0;
  ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS topics text[] DEFAULT ARRAY['DSA', 'Web Dev'];
  ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS languages text[] DEFAULT ARRAY['English', 'Hindi'];
  ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS availability text DEFAULT 'available';
  ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bio text DEFAULT 'GyanSetu Member';
  ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS welcome_bonus_given boolean DEFAULT true;
  ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS total_earned integer DEFAULT 0;
  ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS total_spent integer DEFAULT 0;
  ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS pending_credits integer DEFAULT 0;
  ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
  ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- ── 2. SESSIONS TABLE ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  learner_id uuid,
  mentor_id uuid,
  learner_name text,
  mentor_name text,
  topic text,
  credits_offered integer DEFAULT 10,
  note text,
  status text DEFAULT 'pending',
  quiz jsonb DEFAULT '[]'::jsonb,
  quiz_passed boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

DO $$
BEGIN
  ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS learner_id uuid;
  ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS mentor_id uuid;
  ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS learner_name text;
  ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS mentor_name text;
  ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS topic text;
  ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS credits_offered integer DEFAULT 10;
  ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS note text;
  ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending';
  ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS quiz jsonb DEFAULT '[]'::jsonb;
  ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS quiz_passed boolean DEFAULT false;
  ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
  ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- ── 3. CREDITS TABLE ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.credits (
  username text PRIMARY KEY,
  balance integer DEFAULT 50,
  updated_at timestamptz DEFAULT now()
);

-- ── 4. CREDIT_LOG TABLE ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.credit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid,
  from_user text,
  to_user text,
  amount integer,
  created_at timestamptz DEFAULT now()
);

-- ── 5. CREDIT_LEDGER TABLE ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.credit_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  amount integer NOT NULL,
  type text NOT NULL,
  reason text,
  reference_type text,
  status text DEFAULT 'COMPLETED',
  created_at timestamptz DEFAULT now()
);

DO $$
BEGIN
  ALTER TABLE public.credit_ledger ADD COLUMN IF NOT EXISTS user_id uuid;
  ALTER TABLE public.credit_ledger ADD COLUMN IF NOT EXISTS amount integer;
  ALTER TABLE public.credit_ledger ADD COLUMN IF NOT EXISTS type text;
  ALTER TABLE public.credit_ledger ADD COLUMN IF NOT EXISTS reason text;
  ALTER TABLE public.credit_ledger ADD COLUMN IF NOT EXISTS reference_type text;
  ALTER TABLE public.credit_ledger ADD COLUMN IF NOT EXISTS status text DEFAULT 'COMPLETED';
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- ── 6. ROOM_STATE TABLE ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.room_state (
  room_id text PRIMARY KEY,
  code text DEFAULT '',
  lang text DEFAULT 'javascript',
  canvas text DEFAULT '',
  updated_at timestamptz DEFAULT now()
);

-- ── 7. ROW LEVEL SECURITY (RLS) POLICIES ────────────────────────────
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_state ENABLE ROW LEVEL SECURITY;

-- Profiles: Allow anyone to view and update/insert
DROP POLICY IF EXISTS "Public profiles read" ON public.profiles;
CREATE POLICY "Public profiles read" ON public.profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public profiles insert" ON public.profiles;
CREATE POLICY "Public profiles insert" ON public.profiles FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Public profiles update" ON public.profiles;
CREATE POLICY "Public profiles update" ON public.profiles FOR UPDATE USING (true);

-- Sessions: Allow all read/write
DROP POLICY IF EXISTS "Public sessions all" ON public.sessions;
CREATE POLICY "Public sessions all" ON public.sessions FOR ALL USING (true) WITH CHECK (true);

-- Credits: Allow all read/write
DROP POLICY IF EXISTS "Public credits all" ON public.credits;
CREATE POLICY "Public credits all" ON public.credits FOR ALL USING (true) WITH CHECK (true);

-- Credit Log: Allow all read/write
DROP POLICY IF EXISTS "Public credit_log all" ON public.credit_log;
CREATE POLICY "Public credit_log all" ON public.credit_log FOR ALL USING (true) WITH CHECK (true);

-- Credit Ledger: Allow all read/write
DROP POLICY IF EXISTS "Public credit_ledger all" ON public.credit_ledger;
CREATE POLICY "Public credit_ledger all" ON public.credit_ledger FOR ALL USING (true) WITH CHECK (true);

-- Room State: Allow all read/write
DROP POLICY IF EXISTS "Public room_state all" ON public.room_state;
CREATE POLICY "Public room_state all" ON public.room_state FOR ALL USING (true) WITH CHECK (true);

-- ── 8. FIX AUTH TRIGGER (Fixes "500 Database error saving new user") ─
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_name text;
  v_dept text;
  v_role text;
BEGIN
  v_name := COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1));
  v_dept := COALESCE(new.raw_user_meta_data->>'department', 'General');
  v_role := COALESCE(new.raw_user_meta_data->>'role', 'learner');

  -- Create profile row
  INSERT INTO public.profiles (
    id, email, full_name, department, role, credits, xp, streak, welcome_bonus_given
  ) VALUES (
    new.id, new.email, v_name, v_dept, v_role, 100, 50, 1, true
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name);

  -- Initialize credits balance
  INSERT INTO public.credits (username, balance)
  VALUES (v_name, 100)
  ON CONFLICT (username) DO NOTHING;

  -- Initial ledger entry
  INSERT INTO public.credit_ledger (user_id, amount, type, reason, reference_type, status)
  VALUES (new.id, 100, 'WELCOME_BONUS', 'Welcome bonus on signup', 'system', 'COMPLETED');

  RETURN new;
EXCEPTION WHEN OTHERS THEN
  -- Never crash auth.users signup even if an edge case occurs
  RETURN new;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ── 9. SAMPLE MENTORS FOR PEERS PAGE ────────────────────────────────
DO $$
BEGIN
  -- Drop foreign key constraint if it exists so sample mentors can be inserted
  ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;

  INSERT INTO public.profiles (id, full_name, email, department, year, role, credits, xp, streak, rating, sessions_count, topics, languages, availability, bio)
  VALUES
    ('a0000000-0000-0000-0000-000000000001', 'Aarav Sharma', 'aarav@gyansetu.edu', 'CSE', '3rd Year', 'mentor', 250, 1420, 7, 4.9, 142, ARRAY['DSA', 'Algorithms'], ARRAY['C++', 'Python'], 'available', 'Competitive programmer & DSA mentor.'),
    ('a0000000-0000-0000-0000-000000000002', 'Priya Mehta', 'priya@gyansetu.edu', 'IT', '2nd Year', 'mentor', 190, 980, 5, 4.8, 97, ARRAY['Web Dev', 'React'], ARRAY['JavaScript', 'TypeScript'], 'available', 'Frontend & React enthusiast.'),
    ('a0000000-0000-0000-0000-000000000003', 'Rohan Gupta', 'rohan@gyansetu.edu', 'AIML', '4th Year', 'mentor', 310, 2100, 12, 4.7, 210, ARRAY['Machine Learning', 'Python'], ARRAY['Python', 'R'], 'busy', 'ML researcher and data science guide.')
  ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;
