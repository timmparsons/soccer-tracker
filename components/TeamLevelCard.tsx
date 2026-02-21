// components/TeamLevelCard.tsx
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

export function TeamLevelCard() {
  const { data: user } = useUser();
  const { data: team } = useTeam(user?.id);
  const [modalVisible, setModalVisible] = useState(false);
  const [minimumModalVisible, setMinimumModalVisible] = useState(false);

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

  // Get player contributions
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
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading team data...</Text>
      </View>
    );
  }

  const currentLevelXp = getXpForLevel(teamData.team_level);
  const nextLevelXp = getXpForLevel(teamData.team_level + 1);
  const xpNeededForNext = nextLevelXp - currentLevelXp; // Always 5,000
  const xpProgressThisLevel = teamData.team_xp - currentLevelXp;
  const progressPercent = (xpProgressThisLevel / xpNeededForNext) * 100;

  // Calculate per-player requirements for NEXT level
  const xpPerPlayer = playerCount
    ? Math.ceil(xpNeededForNext / playerCount)
    : xpNeededForNext;

  // Calculate minimum XP each player needs for the CURRENT level
  const minimumXpPerPlayer =
    playerCount > 0 ? Math.floor(xpNeededForNext / playerCount) : 0;

  // Find players who haven't met the minimum YET for reaching the next level
  const playersNeedingMinimum =
    playerContributions
      ?.map((p) => {
        const xpThisLevel = Math.max(0, p.total_xp - currentLevelXp);
        return {
          id: p.id,
          display_name: p.display_name,
          xpThisLevel,
          minimumNeeded: minimumXpPerPlayer,
          remaining: Math.max(0, minimumXpPerPlayer - xpThisLevel),
        };
      })
      .filter((p) => p.xpThisLevel < minimumXpPerPlayer) || [];

  // Calculate average XP per player (total career XP)
  const averageXp = playerCount > 0 ? teamData.team_xp / playerCount : 0;

  const unlockedItems = getUnlockedItems(teamData.team_level);
  const nextUnlock = getNextUnlock(teamData.team_level);

  const recentBadges = unlockedItems
    .filter((i) => i.type === 'badge')
    .slice(-2);
  const recentThemes = unlockedItems
    .filter((i) => i.type === 'theme')
    .slice(-2);
  const currentTitle = unlockedItems
    .filter((i) => i.type === 'title')
    .slice(-1)[0];

  const getTypeStyle = (type: string) => {
    switch (type) {
      case 'badge':
        return { color: '#F59E0B', label: 'Badge' };
      case 'theme':
        return { color: '#3B82F6', label: 'Theme' };
      case 'celebration':
        return { color: '#10B981', label: 'Celebration' };
      case 'title':
        return { color: '#8B5CF6', label: 'Team Title' };
      default:
        return { color: '#6B7280', label: 'Unlock' };
    }
  };

  return (
    <>
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.teamName}>{teamData.name}</Text>
            {currentTitle && (
              <View style={styles.titleBadge}>
                <Text style={styles.titleIcon}>{currentTitle.icon}</Text>
                <Text style={styles.titleText}>{currentTitle.name}</Text>
              </View>
            )}
          </View>
          <View style={styles.levelBadge}>
            <Text style={styles.levelText}>LVL {teamData.team_level}</Text>
          </View>
        </View>

        <View style={styles.xpContainer}>
          <View style={styles.progressBarContainer}>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${Math.max(0, Math.min(progressPercent, 100))}%` },
                ]}
              />
            </View>
            <Text style={styles.xpText}>
              {Math.max(0, xpProgressThisLevel).toLocaleString()} /{' '}
              {xpNeededForNext.toLocaleString()} XP to Level{' '}
              {teamData.team_level + 1}
            </Text>
          </View>
        </View>

        {/* Per-Player Breakdown */}
        {playerCount > 0 && (
          <TouchableOpacity
            style={styles.infoBox}
            onPress={() => setModalVisible(true)}
            activeOpacity={0.7}
          >
            <View style={styles.infoHeader}>
              <Ionicons name='information-circle' size={20} color='#2B9FFF' />
              <Text style={styles.infoTitle}>
                To Reach Level {teamData.team_level + 1}
              </Text>
              {playersNeedingMinimum.length > 0 && (
                <TouchableOpacity
                  onPress={(e) => {
                    e.stopPropagation();
                    setMinimumModalVisible(true);
                  }}
                  style={styles.warningIconButton}
                >
                  <Ionicons name='warning' size={20} color='#F59E0B' />
                </TouchableOpacity>
              )}
              <Ionicons name='chevron-forward' size={20} color='#2B9FFF' />
            </View>
            <View style={styles.infoContent}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Team needs:</Text>
                <Text style={styles.infoValue}>
                  {(xpNeededForNext - xpProgressThisLevel).toLocaleString()}{' '}
                  more juggles
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>
                  Per player ({playerCount} players):
                </Text>
                <Text style={styles.infoValue}>
                  ~
                  {Math.ceil(
                    (xpNeededForNext - xpProgressThisLevel) / playerCount
                  ).toLocaleString()}{' '}
                  more juggles each
                </Text>
              </View>
            </View>
            <View style={styles.exampleBox}>
              <Text style={styles.exampleText}>
                💡 Example: If each player does 50 juggles per practice, that&apos;s
                about{' '}
                {Math.ceil(
                  Math.ceil(
                    (xpNeededForNext - xpProgressThisLevel) / playerCount
                  ) / 50
                )}{' '}
                practices per player
              </Text>
            </View>
            <Text style={styles.tapHint}>Tap to see all levels</Text>
          </TouchableOpacity>
        )}

        {/* Player Contributions - Accountability Section */}
        {playerContributions && playerContributions.length > 0 && (
          <View style={styles.contributionsSection}>
            <Text style={styles.sectionTitle}>
              Team Contributions (Total Career XP)
            </Text>
            <View style={styles.contributionsCard}>
              {playerContributions.map((player, index) => {
                const percentOfTeam =
                  teamData.team_xp > 0
                    ? (player.total_xp / teamData.team_xp) * 100
                    : 0;
                const isBelowAverage = player.total_xp < averageXp;
                const isTopContributor = index === 0;
                const behindAmount = Math.round(averageXp - player.total_xp);

                return (
                  <View key={player.id} style={styles.playerRow}>
                    <View style={styles.playerInfo}>
                      <View
                        style={[
                          styles.playerRank,
                          isTopContributor && styles.topPlayerRank,
                        ]}
                      >
                        <Text
                          style={[
                            styles.playerRankText,
                            isTopContributor && styles.topPlayerRankText,
                          ]}
                        >
                          #{index + 1}
                        </Text>
                      </View>
                      <View style={styles.playerNameContainer}>
                        <Text style={styles.playerName}>
                          {player.display_name}
                        </Text>
                        {isBelowAverage && playerCount > 1 && (
                          <View style={styles.belowAverageBadge}>
                            <Ionicons
                              name='trending-down'
                              size={12}
                              color='#EF4444'
                            />
                            <Text style={styles.belowAverageText}>
                              {behindAmount} XP behind avg
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>
                    <View style={styles.playerStats}>
                      <Text style={styles.playerXp}>
                        {player.total_xp.toLocaleString()} XP
                      </Text>
                      <Text style={styles.playerPercent}>
                        {percentOfTeam.toFixed(1)}%
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>

            <View style={styles.averageInfoBox}>
              <Ionicons name='analytics' size={16} color='#6B7280' />
              <Text style={styles.averageInfoText}>
                Team average: {Math.round(averageXp).toLocaleString()} total XP
                per player
              </Text>
            </View>
          </View>
        )}

        {nextUnlock && (
          <View style={styles.nextUnlockContainer}>
            <Text style={styles.nextUnlockTitle}>
              Next Unlock at Level {nextUnlock.level}
            </Text>
            <View style={styles.unlockItem}>
              <Text style={styles.unlockIcon}>{nextUnlock.icon}</Text>
              <View style={styles.unlockContent}>
                <View style={styles.unlockHeader}>
                  <Text style={styles.unlockName}>{nextUnlock.name}</Text>
                  <View
                    style={[
                      styles.typeBadge,
                      { backgroundColor: getTypeStyle(nextUnlock.type).color },
                    ]}
                  >
                    <Text style={styles.typeText}>
                      {getTypeStyle(nextUnlock.type).label}
                    </Text>
                  </View>
                </View>
                <Text style={styles.unlockDescription}>
                  {nextUnlock.description}
                </Text>
              </View>
            </View>
          </View>
        )}

        {recentBadges.length > 0 && (
          <View style={styles.unlockedSection}>
            <Text style={styles.sectionTitle}>Team Badges</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {recentBadges.map((item, index) => (
                <View key={index} style={styles.unlockedBadge}>
                  <Text style={styles.unlockedIcon}>{item.icon}</Text>
                  <Text style={styles.unlockedName}>{item.name}</Text>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {recentThemes.length > 0 && (
          <View style={styles.unlockedSection}>
            <Text style={styles.sectionTitle}>Unlocked Themes</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {recentThemes.map((item, index) => (
                <View key={index} style={styles.themeBadge}>
                  <View
                    style={[styles.themeColor, { backgroundColor: item.value }]}
                  />
                  <Text style={styles.themeName}>{item.name}</Text>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        <Text style={styles.totalXpText}>
          Total Team XP: {teamData.team_xp.toLocaleString()}
        </Text>
      </View>

      <TeamLevelInfoModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
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
    </>
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
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  headerLeft: {
    flex: 1,
  },
  teamName: {
    fontSize: 24,
    fontWeight: '900',
    color: '#2C3E50',
    marginBottom: 8,
  },
  titleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F9FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
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
    backgroundColor: '#2B9FFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  levelText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#FFF',
    letterSpacing: 0.5,
  },
  xpContainer: {
    marginBottom: 20,
  },
  progressBarContainer: {
    width: '100%',
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
    backgroundColor: '#2B9FFF',
    borderRadius: 6,
  },
  xpText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    fontWeight: '600',
  },
  infoBox: {
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  infoTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '800',
    color: '#2B9FFF',
  },
  infoContent: {
    gap: 8,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '600',
  },
  infoValue: {
    fontSize: 14,
    color: '#2C3E50',
    fontWeight: '800',
  },
  exampleBox: {
    backgroundColor: '#DBEAFE',
    padding: 10,
    borderRadius: 8,
    marginTop: 12,
  },
  exampleText: {
    fontSize: 12,
    color: '#1E40AF',
    fontWeight: '600',
    lineHeight: 18,
  },
  tapHint: {
    fontSize: 12,
    color: '#2B9FFF',
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 8,
  },
  // MINIMUM REQUIREMENT WARNING
  minimumRequirementBox: {
    flexDirection: 'row',
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#FCD34D',
    gap: 12,
  },
  minimumTextContainer: {
    flex: 1,
  },
  minimumTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#92400E',
    marginBottom: 8,
  },
  minimumText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#78350F',
    marginBottom: 12,
    lineHeight: 20,
  },
  minimumPlayersText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#92400E',
    marginBottom: 8,
  },
  minimumPlayerName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#78350F',
    marginBottom: 4,
    paddingLeft: 8,
  },
  contributionsSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 12,
    textTransform: 'uppercase',
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  contributionsCard: {
    backgroundColor: '#F5F9FF',
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  playerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  playerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  playerRank: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  topPlayerRank: {
    backgroundColor: '#FFD700',
  },
  playerRankText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#6B7280',
  },
  topPlayerRankText: {
    color: '#FFF',
  },
  playerNameContainer: {
    flex: 1,
  },
  playerName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#2C3E50',
    marginBottom: 2,
  },
  belowAverageBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  belowAverageText: {
    fontSize: 12,
    color: '#EF4444',
    fontWeight: '600',
  },
  playerStats: {
    alignItems: 'flex-end',
  },
  playerXp: {
    fontSize: 16,
    fontWeight: '900',
    color: '#2C3E50',
  },
  playerPercent: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  averageInfoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 12,
    marginTop: 12,
    gap: 8,
  },
  averageInfoText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  nextUnlockContainer: {
    backgroundColor: '#F5F9FF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  nextUnlockTitle: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 12,
    textTransform: 'uppercase',
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  unlockItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  unlockIcon: {
    fontSize: 32,
    marginRight: 12,
    marginTop: 4,
  },
  unlockContent: {
    flex: 1,
  },
  unlockHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  unlockName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2C3E50',
    marginRight: 8,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  typeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFF',
    textTransform: 'uppercase',
  },
  unlockDescription: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  unlockedSection: {
    marginBottom: 20,
  },
  unlockedBadge: {
    backgroundColor: '#F5F9FF',
    borderRadius: 12,
    padding: 12,
    marginRight: 12,
    alignItems: 'center',
    minWidth: 90,
  },
  unlockedIcon: {
    fontSize: 28,
    marginBottom: 6,
  },
  unlockedName: {
    fontSize: 11,
    color: '#2C3E50',
    textAlign: 'center',
    fontWeight: '700',
  },
  themeBadge: {
    backgroundColor: '#F5F9FF',
    borderRadius: 12,
    padding: 12,
    marginRight: 12,
    alignItems: 'center',
    minWidth: 90,
  },
  themeColor: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginBottom: 8,
    borderWidth: 3,
    borderColor: '#FFF',
  },
  themeName: {
    fontSize: 11,
    color: '#2C3E50',
    textAlign: 'center',
    fontWeight: '700',
  },
  totalXpText: {
    fontSize: 13,
    color: '#9CA3AF',
    textAlign: 'center',
    fontWeight: '600',
  },
});
