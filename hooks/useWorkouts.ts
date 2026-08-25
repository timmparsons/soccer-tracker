import { useDrills } from '@/hooks/useTouchTracking';
import { supabase } from '@/lib/supabase';
import { useQuery } from '@tanstack/react-query';
import {
  DailyChallengeStep,
  RawStep,
  calculateChallengeTouches,
  resolveSteps,
} from './useDailyChallenge';

export interface Workout {
  id: string;
  title: string;
  category: string;
  steps: DailyChallengeStep[];
  estimatedTouches: number;
  durationSeconds: number | null;
}

interface RawWorkout {
  id: string;
  title: string;
  category: string;
  steps: RawStep[];
  duration_seconds: number | null;
}

export function useWorkoutLibrary() {
  const { data: drills } = useDrills();

  const { data: rawWorkouts, isLoading } = useQuery({
    queryKey: ['workout-library'],
    queryFn: async (): Promise<RawWorkout[]> => {
      const { data, error } = await (supabase as any)
        .from('workouts')
        .select('id, title, category, steps, duration_seconds')
        .order('category')
        .order('title');
      if (error) throw error;
      return data ?? [];
    },
  });

  const drillMap = new Map(
    (drills ?? []).map((d: { id: string; name: string; video_url: string | null }) => [
      d.id,
      { name: d.name, videoUrl: d.video_url ?? undefined },
    ]),
  );

  const workouts: Workout[] = (rawWorkouts ?? []).map((w) => {
    const steps = resolveSteps(w.steps, drillMap);
    return {
      id: w.id,
      title: w.title,
      category: w.category,
      steps,
      estimatedTouches: calculateChallengeTouches(steps),
      durationSeconds: w.duration_seconds,
    };
  });

  return {
    workouts,
    isLoading: isLoading || !drills,
  };
}

// Deterministic pick so every player sees the same circuit on a given day
// (rotates as more variants are authored).
export function pickDailyCircuit(
  workouts: Workout[],
  durationSeconds: number,
  date: Date = new Date(),
): Workout | undefined {
  const matches = workouts.filter((w) => w.durationSeconds === durationSeconds);
  if (matches.length === 0) return undefined;
  const seed = date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate();
  return matches[seed % matches.length];
}
