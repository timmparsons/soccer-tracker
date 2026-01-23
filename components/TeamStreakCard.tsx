// components/TeamStreakCard.tsx
import { useTeam } from '@/hooks/useTeam';
import { useUser } from '@/hooks/useUser';
import { supabase } from '@/lib/supabase';
import { useQuery } from '@tanstack/react-query';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface StreakData {
  current_streak: number;
  longest_streak: number;
  players_today: number;
  total_players: number;
}

export function TeamStreakCard() {
  const { data: user } = useUser();
  const { data: team } = useTeam(user?.id);

  const { data: streakData } = useQuery({
    queryKey: ['team-streak', team?.id],
    queryFn: async () => {
      if (!team?.id) return null;

      // Get streak record
      const { data: streak } = await supabase
        .from('team_streaks')
        .select('current_streak, longest_streak')
        .eq('team_id', team.id)
        .single();

      // Get today's contributors
      const today = new Date().toISOString().split('T')[0];
      const { data: contributions } = await supabase
        .from('streak_contributions')
        .select('player_id')
        .eq('team_id', team.id)
        .eq('practice_date', today);

      // Get total players
      const { count: totalPlayers } = await supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('team_id', team.id)
        .eq('role', 'player');

      return {
        current_streak: streak?.current_streak || 0,
        longest_streak: streak?.longest_streak || 0,
        players_today: contributions?.length || 0,
        total_players: totalPlayers || 0,
      } as StreakData;
    },
    enabled: !!team?.id,
  });

  if (!streakData) return null;

  const flameSize = Math.min(60 + streakData.current_streak * 2, 120);
  const allPracticed = streakData.players_today >= streakData.total_players;

  return (
    <View style={styles.container}>
      <View style={styles.flameContainer}>
        <Text style={[styles.flame, { fontSize: flameSize }]}>🔥</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.title}>Team Streak</Text>
        <Text style={styles.streakNumber}>
          {streakData.current_streak}{' '}
          {streakData.current_streak === 1 ? 'day' : 'days'}
        </Text>

        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${
                    (streakData.players_today / streakData.total_players) * 100
                  }%`,
                  backgroundColor: allPracticed ? '#10B981' : '#FFA500',
                },
              ]}
            />
          </View>
          <Text style={styles.progressText}>
            {streakData.players_today}/{streakData.total_players} practiced
            today
          </Text>
        </View>

        {allPracticed && (
          <Text style={styles.celebrationText}>
            Everyone practiced! Keep the flame alive!
          </Text>
        )}

        {streakData.longest_streak > 0 && (
          <Text style={styles.recordText}>
            Record: {streakData.longest_streak} days
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  flameContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  flame: {
    fontSize: 60,
  },
  content: {
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    color: '#2C3E50',
    marginBottom: 8,
  },
  streakNumber: {
    fontSize: 48,
    fontWeight: '900',
    color: '#FFA500',
    marginBottom: 24,
  },
  progressContainer: {
    width: '100%',
    marginBottom: 16,
  },
  progressBar: {
    height: 12,
    backgroundColor: '#F5F9FF',
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressFill: {
    height: '100%',
    borderRadius: 6,
  },
  progressText: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    fontWeight: '600',
  },
  celebrationText: {
    fontSize: 16,
    color: '#10B981',
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 12,
  },
  recordText: {
    fontSize: 15,
    color: '#6B7280',
    marginTop: 16,
    fontWeight: '600',
  },
});
