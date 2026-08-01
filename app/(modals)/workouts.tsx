import PageHeader from '@/components/common/PageHeader';
import WorkoutRunnerModal from '@/components/modals/WorkoutRunnerModal';
import { Workout, useWorkoutLibrary } from '@/hooks/useWorkouts';
import { useUser } from '@/hooks/useUser';
import { track } from '@/lib/analytics';
import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

function stepSummary(workout: Workout): string {
  return workout.steps
    .map((s) => (s.type === 'single' ? `${s.reps}x ${s.drillName}` : `${s.reps}x ${s.comboName}`))
    .join(' · ');
}

export default function WorkoutsScreen() {
  const { data: user } = useUser();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { workouts, isLoading } = useWorkoutLibrary();

  const [categoryFilter, setCategoryFilter] = useState('all');
  const [activeWorkout, setActiveWorkout] = useState<Workout | null>(null);

  useEffect(() => {
    track('workouts_viewed');
  }, []);

  const categories = useMemo(
    () => Array.from(new Set(workouts.map((w) => w.category))),
    [workouts],
  );

  const visibleWorkouts =
    categoryFilter === 'all' ? workouts : workouts.filter((w) => w.category === categoryFilter);

  const handleCompleted = () => {
    if (!user?.id) return;
    queryClient.invalidateQueries({ queryKey: ['activity-feed'] });
    queryClient.invalidateQueries({ queryKey: ['touch-tracking', user.id] });
  };

  return (
    <View style={styles.container}>
      <PageHeader
        title='Workouts'
        showAvatar={false}
        rightComponent={
          <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
            <Ionicons name='close' size={24} color='#78909C' />
          </TouchableOpacity>
        }
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {categories.length > 0 && (
          <View style={styles.filterRow}>
            {(['all', ...categories]).map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[styles.filterPill, categoryFilter === cat && styles.filterPillActive]}
                onPress={() => setCategoryFilter(cat)}
              >
                <Text
                  style={[styles.filterPillText, categoryFilter === cat && styles.filterPillTextActive]}
                >
                  {cat === 'all' ? 'All' : cat}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {!isLoading && visibleWorkouts.length === 0 && (
          <Text style={styles.emptyText}>No workouts in this category yet.</Text>
        )}

        <View style={styles.workoutList}>
          {visibleWorkouts.map((workout) => (
            <TouchableOpacity
              key={workout.id}
              style={styles.workoutCard}
              onPress={() => setActiveWorkout(workout)}
              activeOpacity={0.8}
            >
              <View style={styles.workoutCardHeader}>
                <Text style={styles.workoutTitle}>{workout.title}</Text>
                <View style={styles.categoryBadge}>
                  <Text style={styles.categoryBadgeText}>{workout.category}</Text>
                </View>
              </View>
              <Text style={styles.workoutSummary} numberOfLines={2}>
                {stepSummary(workout)}
              </Text>
              <Text style={styles.touchesEstimate}>
                ≈ {workout.estimatedTouches.toLocaleString()} touches
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {user?.id && activeWorkout && (
        <WorkoutRunnerModal
          visible={!!activeWorkout}
          onClose={() => setActiveWorkout(null)}
          workout={activeWorkout}
          steps={activeWorkout.steps}
          profileId={user.id}
          onCompleted={handleCompleted}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  closeButton: {
    padding: 4,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  filterPill: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: '#F0F2F5',
  },
  filterPillActive: {
    backgroundColor: '#1f89ee',
  },
  filterPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#78909C',
  },
  filterPillTextActive: {
    color: '#FFF',
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#78909C',
    textAlign: 'center',
    marginTop: 20,
  },
  workoutList: {
    gap: 12,
  },
  workoutCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  workoutCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 6,
  },
  workoutTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1a1a2e',
    flex: 1,
  },
  categoryBadge: {
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  categoryBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#1f89ee',
  },
  workoutSummary: {
    fontSize: 13,
    fontWeight: '600',
    color: '#78909C',
    lineHeight: 18,
    marginBottom: 8,
  },
  touchesEstimate: {
    fontSize: 12,
    fontWeight: '700',
    color: '#31af4d',
  },
});
