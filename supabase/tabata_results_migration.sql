-- Tabata results: persists each 4-min Tabata session attempt so the Compete
-- tab can show a "Tabata High Scores" leaderboard (max total_reps per user).
-- Applied live via mcp__supabase__apply_migration (see migration
-- "create_tabata_results" in the project's migration history).

CREATE TABLE public.tabata_results (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  date               DATE NOT NULL,
  rounds_completed   INT  NOT NULL,
  total_reps         INT  NOT NULL,
  touches_credited   INT  NOT NULL,
  daily_session_id   UUID REFERENCES public.daily_sessions(id) ON DELETE SET NULL,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW())
);

CREATE INDEX tabata_results_user_reps_idx ON public.tabata_results (user_id, total_reps DESC);
CREATE INDEX tabata_results_user_date_idx ON public.tabata_results (user_id, date);

ALTER TABLE public.tabata_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own tabata results" ON public.tabata_results
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Team members can read tabata results" ON public.tabata_results
  FOR SELECT USING (true);
