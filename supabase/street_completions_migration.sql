CREATE TABLE public.street_challenge_completions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  challenge_id TEXT NOT NULL,
  challenge_name TEXT NOT NULL,
  category TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX ON public.street_challenge_completions (profile_id, created_at DESC);
CREATE INDEX ON public.street_challenge_completions (created_at DESC);

ALTER TABLE public.street_challenge_completions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own completions"
  ON public.street_challenge_completions FOR INSERT
  WITH CHECK (auth.uid() = profile_id);

CREATE POLICY "Team members can read completions"
  ON public.street_challenge_completions FOR SELECT
  USING (true);
