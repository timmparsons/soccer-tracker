CREATE TABLE public.daily_challenges (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  date        DATE        NOT NULL UNIQUE,
  title       TEXT        NOT NULL,
  steps       JSONB       NOT NULL, -- [{drill_id: UUID, reps: INT}], max 5 items, reps <= 60
  created_at  TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE TABLE public.daily_challenge_completions (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id   UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  challenge_id UUID        NOT NULL REFERENCES public.daily_challenges(id) ON DELETE CASCADE,
  time_seconds INT         NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE (profile_id, challenge_id)
);

CREATE INDEX ON public.daily_challenge_completions (challenge_id, created_at DESC);
CREATE INDEX ON public.daily_challenge_completions (profile_id, created_at DESC);

ALTER TABLE public.daily_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_challenge_completions ENABLE ROW LEVEL SECURITY;

-- Allow app to auto-insert fallback challenges when no entry exists for a date
CREATE POLICY "Authenticated users can insert daily challenges"
  ON public.daily_challenges FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can read daily challenges"
  ON public.daily_challenges FOR SELECT
  USING (true);

CREATE POLICY "Users can insert own completions"
  ON public.daily_challenge_completions FOR INSERT
  WITH CHECK (auth.uid() = profile_id);

CREATE POLICY "Team members can read completions"
  ON public.daily_challenge_completions FOR SELECT
  USING (true);