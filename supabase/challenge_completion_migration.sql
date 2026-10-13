-- Tag circuit / skill challenge sessions with the workout they came from so
-- the home "Challenge of the Day" card can show today's pick as completed.
ALTER TABLE public.daily_sessions
  ADD COLUMN workout_id UUID REFERENCES public.workouts(id) ON DELETE SET NULL;
