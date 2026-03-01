// components/TeamDashboard.tsx
import { useTeam } from '@/hooks/useTeam';
import { useUser } from '@/hooks/useUser';
import { supabase } from '@/lib/supabase';
import {
  getNextUnlock,
  getUnlockedItems,
  getXpForLevel,
} from '@/lib/teamUnlockables';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import React, { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { MinimumRequirementModal } from './MinimumRequirementModal';
import { TeamLevelInfoModal } from './TeamLevelInfoModal';

interface PlayerContribution {
  id: string;
  display_name: string;
  total_xp: number;
  avatar_url?: string;
}

export function TeamDashboard() {
  const { data: user } = useUser();
  const { data: team } = useTeam(user?.id);
  const [levelModalVisible, setLevelModalVisible] = useState(false);
  const [minimumModalVisible, setMinimumModalVisible] = useState(false);
  const [contributorsExpanded, setContributorsExpanded] = useState(false);

  // Team data query
  const { data: teamData } = useQuery({
    queryKey: ['team-level', team?.id],
    queryFn: async () => {
      if (!team?.id) return null;

      const { data, error } = await supabase
        .from('teams')
        .select('name, team_xp, team_level')
        .eq('id', team.id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!team?.id,
  });

  // Team streak query
  const { data: streakData } = useQuery({
    queryKey: ['team-streak', team?.id],
    queryFn: async () => {
      if (!team?.id) return null;

      const { data, error } = await supabase
        .from('team_streaks')
        .select('*')
        .eq('team_id', team.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
    enabled: !!team?.id,
  });

  // Today's contributors query
  const { data: todayContributors } = useQuery({
    queryKey: ['today-contributors', team?.id],
    queryFn: async () => {
      if (!team?.id) return { practiced: 0, total: 0 };

      const today = new Date().toISOString().split('T')[0];

      const { data: contributions } = await supabase
        .from('streak_contributions')
        .select('player_id')
        .eq('team_id', team.id)
        .eq('contribution_date', today);

      const { count: totalPlayers } = await supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('team_id', team.id)
        .eq('role', 'player')
        .eq('is_coach', false);

      return {
        practiced: contributions?.length || 0,
        total: totalPlayers || 0,
      };
    },
    enabled: !!team?.id,
  });

  // Player contributions query
  const { data: playerContributions } = useQuery({
    queryKey: ['team-player-contributions', team?.id],
    queryFn: async () => {
      if (!team?.id) return [];

      const { data, error } = await supabase
        .from('profiles')
        .select('id, display_name, total_xp, avatar_url, is_coach')
        .eq('team_id', team.id)
        .eq('role', 'player')
        .eq('is_coach', false)
        .order('total_xp', { ascending: false });

      if (error) throw error;
      return data as PlayerContribution[];
    },
    enabled: !!team?.id,
  });

  const playerCount = playerContributions?.length || 0;

  if (!teamData) {
    return (
      <ScrollView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading team dashboard...</Text>
        </View>
      </ScrollView>
    );
  }

  const currentLevelXp = getXpForLevel(teamData.team_level);
  const nextLevelXp = getXpForLevel(teamData.team_level + 1);
  const xpNeededForNext = nextLevelXp - currentLevelXp;
  const xpProgressThisLevel = teamData.team_xp - currentLevelXp;
  const progressPercent = (xpProgressThisLevel / xpNeededForNext) * 100;
  const xpRemaining = xpNeededForNext - xpProgressThisLevel;

  const minimumXpPerPlayer =
    playerCount > 0 ? Math.floor(xpNeededForNext / playerCount) : 0;

  const playersNeedingMinimum =
    playerContributions
      ?.map((p) => {
        const xpThisLevel = Math.max(0, p.total_xp - currentLevelXp);

        // Debug log
        console.log('Player:', p.display_name, {
          total_xp: p.total_xp,
          currentLevelXp,
          xpThisLevel,
          minimumNeeded: minimumXpPerPlayer,
          remaining: Math.max(0, minimumXpPerPlayer - xpThisLevel),
        });

        return {
          id: p.id,
          display_name: p.display_name || 'Unknown Player', // Fallback for missing name
          xpThisLevel,
          minimumNeeded: minimumXpPerPlayer,
          remaining: Math.max(0, minimumXpPerPlayer - xpThisLevel),
        };
      })
      .filter((p) => p.remaining > 0) || []; // Changed from xpThisLevel < minimumXpPerPlayer

  console.log('Players needing minimum:', playersNeedingMinimum);

  const unlockedItems = getUnlockedItems(teamData.team_level);
  const nextUnlock = getNextUnlock(teamData.team_level);
  const currentTitle = unlockedItems
    .filter((i) => i.type === 'title')
    .slice(-1)[0];

  const streakFlameSize = streakData?.current_streak
    ? Math.min(60 + streakData.current_streak * 2, 120)
    : 60;

  const allPracticedToday =
    todayContributors &&
    todayContributors.practiced === todayContributors.total &&
    todayContributors.total > 0;

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
    >
      {/* Header Section */}
      <View style={styles.headerSection}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.teamName}>{teamData.name}</Text>
            {currentTitle && (
              <View style={styles.titleBadge}>
                <Text style={styles.titleIcon}>{currentTitle.icon}</Text>
                <Text style={styles.titleText}>{currentTitle.name}</Text>
              </View>
            )}
          </View>
          <View style={styles.levelBadge}>
            <Text style={styles.levelLabel}>LEVEL</Text>
            <Text style={styles.levelNumber}>{teamData.team_level}</Text>
          </View>
        </View>
      </View>

      {/* Progress Card */}
      <View style={styles.progressCard}>
        <View style={styles.progressHeader}>
          <Text style={styles.progressTitle}>
            Level {teamData.team_level + 1} Progress
          </Text>
          <TouchableOpacity
            onPress={() => setLevelModalVisible(true)}
            style={styles.infoButton}
          >
            <Ionicons
              name='information-circle-outline'
              size={20}
              color='#1f89ee'
            />
          </TouchableOpacity>
        </View>

        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              { width: `${Math.max(0, Math.min(progressPercent, 100))}%` },
            ]}
          />
        </View>

        <View style={styles.progressStats}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>
              {Math.max(0, xpProgressThisLevel).toLocaleString()}
            </Text>
            <Text style={styles.statLabel}>earned</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{xpRemaining.toLocaleString()}</Text>
            <Text style={styles.statLabel}>to go</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={styles.statValue}>
              {playerCount > 0
                ? Math.ceil(xpRemaining / playerCount).toLocaleString()
                : '—'}
            </Text>
            <Text style={styles.statLabel}>per player</Text>
          </View>
        </View>

        {playersNeedingMinimum.length > 0 && (
          <TouchableOpacity
            style={styles.minimumWarning}
            onPress={() => setMinimumModalVisible(true)}
          >
            <Ionicons name='warning' size={18} color='#F59E0B' />
            <Text style={styles.minimumWarningText}>
              {playersNeedingMinimum.length}{' '}
              {playersNeedingMinimum.length === 1
                ? 'player needs'
                : 'players need'}{' '}
              to catch up
            </Text>
            <Ionicons name='chevron-forward' size={18} color='#F59E0B' />
          </TouchableOpacity>
        )}
      </View>

      {/* Two Column Cards */}
      <View style={styles.twoColumnRow}>
        {/* Streak Card */}
        <View style={styles.smallCard}>
          <Text style={styles.smallCardTitle}>Team Streak</Text>
          <Text style={[styles.streakFlame, { fontSize: streakFlameSize }]}>
            🔥
          </Text>
          <Text style={styles.streakDays}>
            {streakData?.current_streak || 0} days
          </Text>
          {streakData && streakData.longest_streak > 0 && (
            <Text style={styles.streakRecord}>
              Record: {streakData.longest_streak}
            </Text>
          )}
        </View>

        {/* Today's Progress Card */}
        <View style={styles.smallCard}>
          <Text style={styles.smallCardTitle}>Today&apos;s Progress</Text>
          <View style={styles.todayProgressCircle}>
            <Text style={styles.todayProgressText}>
              {todayContributors?.practiced || 0}/
              {todayContributors?.total || 0}
            </Text>
          </View>
          <Text
            style={[
              styles.todayStatus,
              allPracticedToday && styles.todayStatusComplete,
            ]}
          >
            {allPracticedToday
              ? '✓ Everyone practiced!'
              : todayContributors?.practiced === 0
              ? 'No practice yet today'
              : `${todayContributors?.practiced} practiced today`}
          </Text>
        </View>
      </View>

      {/* Next Unlock Preview */}
      {nextUnlock && (
        <View style={styles.unlockCard}>
          <View style={styles.unlockHeader}>
            <Text style={styles.unlockTitle}>Next Unlock</Text>
            <View style={styles.unlockLevelBadge}>
              <Text style={styles.unlockLevelText}>
                Level {nextUnlock.level}
              </Text>
            </View>
          </View>
          <View style={styles.unlockContent}>
            <Text style={styles.unlockIcon}>{nextUnlock.icon}</Text>
            <View style={styles.unlockInfo}>
              <Text style={styles.unlockName}>{nextUnlock.name}</Text>
              <Text style={styles.unlockDescription}>
                {nextUnlock.description}
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Contributors Section */}
      {playerContributions && playerContributions.length > 0 && (
        <View style={styles.contributorsSection}>
          <TouchableOpacity
            style={styles.contributorsHeader}
            onPress={() => setContributorsExpanded(!contributorsExpanded)}
          >
            <Text style={styles.contributorsTitle}>Top Contributors</Text>
            <Ionicons
              name={contributorsExpanded ? 'chevron-up' : 'chevron-down'}
              size={20}
              color='#6B7280'
            />
          </TouchableOpacity>

          {contributorsExpanded ? (
            <View style={styles.contributorsList}>
              {playerContributions.map((player, index) => {
                const percentOfTeam =
                  teamData.team_xp > 0
                    ? (player.total_xp / teamData.team_xp) * 100
                    : 0;
                const isTop3 = index < 3;

                return (
                  <View key={player.id} style={styles.contributorRow}>
                    <View
                      style={[
                        styles.contributorRank,
                        isTop3 && styles.contributorRankTop,
                      ]}
                    >
                      <Text
                        style={[
                          styles.contributorRankText,
                          isTop3 && styles.contributorRankTextTop,
                        ]}
                      >
                        {index + 1}
                      </Text>
                    </View>
                    <Text style={styles.contributorName}>
                      {player.display_name}
                    </Text>
                    <View style={styles.contributorStats}>
                      <Text style={styles.contributorXp}>
                        {player.total_xp.toLocaleString()}
                      </Text>
                      <Text style={styles.contributorPercent}>
                        {percentOfTeam.toFixed(0)}%
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          ) : (
            <View style={styles.contributorsPreview}>
              {playerContributions.slice(0, 3).map((player, index) => (
                <View key={player.id} style={styles.previewItem}>
                  <Text style={styles.previewRank}>#{index + 1}</Text>
                  <Text style={styles.previewName}>{player.display_name}</Text>
                  <Text style={styles.previewXp}>{player.total_xp} XP</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      )}

      {/* Modals */}
      <TeamLevelInfoModal
        visible={levelModalVisible}
        onClose={() => setLevelModalVisible(false)}
        currentLevel={teamData.team_level}
        playerCount={playerCount}
      />

      <MinimumRequirementModal
        visible={minimumModalVisible}
        onClose={() => setMinimumModalVisible(false)}
        playersNeedingMinimum={playersNeedingMinimum}
        minimumXpPerPlayer={minimumXpPerPlayer}
        nextLevel={teamData.team_level + 1}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F9FF',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '600',
  },

  // HEADER
  headerSection: {
    marginBottom: 20,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  teamName: {
    fontSize: 28,
    fontWeight: '900',
    color: '#2C3E50',
    marginBottom: 8,
  },
  titleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  titleIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  titleText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#8B5CF6',
  },
  levelBadge: {
    backgroundColor: '#1f89ee',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#1f89ee',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  levelLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#E0F2FE',
    letterSpacing: 1,
  },
  levelNumber: {
    fontSize: 28,
    fontWeight: '900',
    color: '#FFF',
  },

  // PROGRESS CARD
  progressCard: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  progressTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#2C3E50',
  },
  infoButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressBar: {
    height: 16,
    backgroundColor: '#F5F9FF',
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 16,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#1f89ee',
    borderRadius: 8,
  },
  progressStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  statBox: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '900',
    color: '#2C3E50',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#E5E7EB',
  },
  minimumWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    padding: 12,
    borderRadius: 12,
    marginTop: 16,
    gap: 8,
  },
  minimumWarningText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: '#92400E',
  },

  // TWO COLUMN CARDS
  twoColumnRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  smallCard: {
    flex: 1,
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  smallCardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  streakFlame: {
    marginVertical: 8,
  },
  streakDays: {
    fontSize: 24,
    fontWeight: '900',
    color: '#2C3E50',
    marginTop: 8,
  },
  streakRecord: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9CA3AF',
    marginTop: 4,
  },
  todayProgressCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 8,
  },
  todayProgressText: {
    fontSize: 24,
    fontWeight: '900',
    color: '#1f89ee',
  },
  todayStatus: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6B7280',
    marginTop: 8,
  },
  todayStatusComplete: {
    color: '#31af4d',
  },

  // UNLOCK CARD
  unlockCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  unlockHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  unlockTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  unlockLevelBadge: {
    backgroundColor: '#F5F9FF',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
  },
  unlockLevelText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1f89ee',
  },
  unlockContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  unlockIcon: {
    fontSize: 40,
  },
  unlockInfo: {
    flex: 1,
  },
  unlockName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#2C3E50',
    marginBottom: 4,
  },
  unlockDescription: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
    lineHeight: 20,
  },

  // CONTRIBUTORS
  contributorsSection: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  contributorsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  contributorsTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#2C3E50',
  },
  contributorsPreview: {
    gap: 8,
  },
  previewItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 10,
    gap: 12,
  },
  previewRank: {
    fontSize: 14,
    fontWeight: '800',
    color: '#9CA3AF',
    width: 30,
  },
  previewName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#2C3E50',
  },
  previewXp: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6B7280',
  },
  contributorsList: {
    gap: 8,
  },
  contributorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 10,
    gap: 12,
  },
  contributorRank: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  contributorRankTop: {
    backgroundColor: '#FCD34D',
  },
  contributorRankText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#6B7280',
  },
  contributorRankTextTop: {
    color: '#92400E',
  },
  contributorName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#2C3E50',
  },
  contributorStats: {
    alignItems: 'flex-end',
  },
  contributorXp: {
    fontSize: 15,
    fontWeight: '800',
    color: '#2C3E50',
  },
  contributorPercent: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9CA3AF',
  },
});
