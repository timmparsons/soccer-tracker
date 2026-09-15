import WorkoutRunnerModal from '@/components/modals/WorkoutRunnerModal';
import { useWorkoutLibrary } from '@/hooks/useWorkouts';
import { useUser } from '@/hooks/useUser';
import { track } from '@/lib/analytics';
import { useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';

export default function SkillChallengeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: user } = useUser();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { workouts, isLoading } = useWorkoutLibrary();

  const workout = workouts.find((w) => w.id === id);

  useEffect(() => {
    if (workout) track('skill_challenge_viewed', { workoutId: workout.id, title: workout.title });
  }, [workout]);

  const handleCompleted = () => {
    if (!user?.id) return;
    queryClient.invalidateQueries({ queryKey: ['activity-feed'] });
    queryClient.invalidateQueries({ queryKey: ['touch-tracking', user.id] });
    queryClient.invalidateQueries({ queryKey: ['active-streak', user.id] });
  };

  if (isLoading || !workout || !user?.id) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF' }}>
        <ActivityIndicator size='large' color='#1f89ee' />
      </View>
    );
  }

  return (
    <WorkoutRunnerModal
      visible={true}
      onClose={() => router.back()}
      workout={workout}
      steps={workout.steps}
      profileId={user.id}
      onCompleted={handleCompleted}
    />
  );
}
