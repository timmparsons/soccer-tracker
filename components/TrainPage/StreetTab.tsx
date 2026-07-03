import { logStreetCompletion, useMyStreetCompletions, useStreetChallengesData } from '@/hooks/useStreetChallenges';
import { useUser } from '@/hooks/useUser';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

export default function StreetTab() {
  const { data: user } = useUser();
  const queryClient = useQueryClient();
  const { data: challenges, isLoading, isError, error } = useStreetChallengesData();
  const { data: completedToday = new Set<string>() } = useMyStreetCompletions(user?.id);
  const [optimistic, setOptimistic] = useState<Set<string>>(new Set());

  const handleComplete = async (challengeId: string, categoryKey: string) => {
    if (!user?.id || !challenges) return;

    setOptimistic((prev) => new Set(prev).add(challengeId));

    const challenge = challenges[categoryKey]?.challenges.find((c) => c.id === challengeId);
    if (!challenge) return;

    try {
      await logStreetCompletion(user.id, challenge, categoryKey, queryClient);
    } catch {
      setOptimistic((prev) => {
        const next = new Set(prev);
        next.delete(challengeId);
        return next;
      });
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color='#1f89ee' />
      </View>
    );
  }

  if (isError) {
    console.error('freestyle_challenges fetch error:', error);
    return (
      <View style={styles.loading}>
        <Text style={styles.errorText}>Failed to load challenges. Check your connection and try again.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.tabSubtitle}>Try any of these for 10 minutes</Text>
      {Object.entries(challenges ?? {}).map(([categoryKey, category]) => (
        <View key={categoryKey} style={styles.section}>
          <Text style={styles.categoryLabel}>{category.label}</Text>
          {category.challenges.map((challenge) => {
            const done = completedToday.has(challenge.id) || optimistic.has(challenge.id);
            return (
              <View key={challenge.id} style={styles.card}>
                <Text style={styles.challengeName}>{challenge.name}</Text>
                <Text style={styles.challengeDesc}>{challenge.description}</Text>
                <TouchableOpacity
                  style={[styles.doneBtn, done && styles.doneBtnCompleted]}
                  onPress={() => handleComplete(challenge.id, categoryKey)}
                  disabled={done}
                  activeOpacity={0.8}
                >
                  <Text style={styles.doneBtnText}>{done ? 'Done today' : 'I did this'}</Text>
                </TouchableOpacity>
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 32,
  },
  tabSubtitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#78909C',
    marginBottom: 20,
  },
  loading: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  errorText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#78909C',
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  section: {
    marginBottom: 20,
  },
  categoryLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: '#78909C',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  categorySubtitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#78909C',
    marginBottom: 10,
  },
  card: {
    backgroundColor: '#F0F4F8',
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#DDE1E7',
  },
  challengeName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1a1a2e',
    marginBottom: 6,
  },
  challengeDesc: {
    fontSize: 13,
    fontWeight: '600',
    color: '#78909C',
    lineHeight: 19,
    marginBottom: 14,
  },
  doneBtn: {
    backgroundColor: '#1f89ee',
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  doneBtnCompleted: {
    backgroundColor: '#31af4d',
  },
  doneBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFF',
  },
});
