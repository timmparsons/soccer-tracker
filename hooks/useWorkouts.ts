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
}

interface RawWorkout {
  id: string;
  title: string;
  category: string;
  steps: RawStep[];
}

export function useWorkoutLibrary() {
  const { data: drills } = useDrills();

  const { data: rawWorkouts, isLoading } = useQuery({
    queryKey: ['workout-library'],
    queryFn: async (): Promise<RawWorkout[]> => {
      const { data, error } = await (supabase as any)
        .from('workouts')
        .select('id, title, category, steps')
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
    };
  });

  return {
    workouts,
    isLoading: isLoading || !drills,
  };
}
