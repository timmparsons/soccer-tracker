// components/TeamLevelInfoModal.tsx
import { getXpForLevel, TEAM_UNLOCKABLES } from '@/lib/teamUnlockables';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

interface TeamLevelInfoModalProps {
  visible: boolean;
  onClose: () => void;
  currentLevel: number;
  playerCount: number;
}

export function TeamLevelInfoModal({
  visible,
  onClose,
  currentLevel,
  playerCount,
}: TeamLevelInfoModalProps) {
  // Generate level breakdown data
  const levels = Array.from({ length: 30 }, (_, i) => {
    const level = i + 1;
    const xpNeeded =
      level === 1 ? 0 : getXpForLevel(level + 1) - getXpForLevel(level);
    const perPlayer =
      playerCount > 0 ? Math.ceil(xpNeeded / playerCount) : xpNeeded;
    const sessions = Math.ceil(perPlayer / 30); // Assuming ~30 XP per session (300 juggles)
    const unlocks = TEAM_UNLOCKABLES.filter((u) => u.level === level);

    return {
      level,
      xpNeeded,
      perPlayer,
      sessions,
      unlocks,
    };
  });

  return (
    <Modal
      visible={visible}
      animationType='slide'
      presentationStyle='pageSheet'
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Level Requirements</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name='close' size={28} color='#2C3E50' />
          </TouchableOpacity>
        </View>

        {/* Info Section */}
        <View style={styles.infoSection}>
          <View style={styles.infoCard}>
            <Ionicons name='people' size={20} color='#1f89ee' />
            <Text style={styles.infoText}>
              {playerCount} {playerCount === 1 ? 'player' : 'players'} on your
              team
            </Text>
          </View>
          <View style={styles.infoCard}>
            <Ionicons name='star' size={20} color='#F59E0B' />
            <Text style={styles.infoText}>Each level = 5,000 team XP</Text>
          </View>
        </View>

        {/* XP Explanation Section */}
        <View style={styles.xpExplanation}>
          <View style={styles.xpExplanationHeader}>
            <Ionicons name='help-circle' size={20} color='#1f89ee' />
            <Text style={styles.xpExplanationTitle}>How to Earn XP</Text>
          </View>
          <View style={styles.xpRule}>
            <Text style={styles.xpRuleIcon}>⚽</Text>
            <Text style={styles.xpRuleText}>10 juggles = 1 XP</Text>
          </View>
          <View style={styles.xpRule}>
            <Text style={styles.xpRuleIcon}>🏆</Text>
            <Text style={styles.xpRuleText}>Personal Best = +50 bonus XP</Text>
          </View>
          <View style={styles.xpRule}>
            <Text style={styles.xpRuleIcon}>👥</Text>
            <Text style={styles.xpRuleText}>
              All player XP combines for team level
            </Text>
          </View>
        </View>

        {/* Levels List */}
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
        >
          {levels.map((levelData) => {
            const isCurrent = levelData.level === currentLevel;
            const isPassed = levelData.level < currentLevel;

            return (
              <View
                key={levelData.level}
                style={[
                  styles.levelCard,
                  isCurrent && styles.currentLevelCard,
                  isPassed && styles.passedLevelCard,
                ]}
              >
                <View style={styles.levelHeader}>
                  <View style={styles.levelTitleRow}>
                    <Text
                      style={[
                        styles.levelNumber,
                        isCurrent && styles.currentLevelNumber,
                        isPassed && styles.passedLevelNumber,
                      ]}
                    >
                      Level {levelData.level}
                    </Text>
                    {isCurrent && (
                      <View style={styles.currentBadge}>
                        <Text style={styles.currentBadgeText}>CURRENT</Text>
                      </View>
                    )}
                    {isPassed && (
                      <Ionicons
                        name='checkmark-circle'
                        size={20}
                        color='#31af4d'
                      />
                    )}
                  </View>
                </View>

                {levelData.level > 1 && (
                  <View style={styles.requirementsSection}>
                    <View style={styles.requirementRow}>
                      <Text style={styles.requirementLabel}>
                        Team XP needed:
                      </Text>
                      <Text style={styles.requirementValue}>
                        {levelData.xpNeeded.toLocaleString()} XP
                      </Text>
                    </View>
                    <View style={styles.requirementRow}>
                      <Text style={styles.requirementLabel}>Per player:</Text>
                      <Text style={styles.requirementValue}>
                        ~{levelData.perPlayer.toLocaleString()} XP
                      </Text>
                    </View>
                    <View style={styles.requirementRow}>
                      <Text style={styles.requirementLabel}>
                        Practice sessions:
                      </Text>
                      <Text style={styles.requirementValue}>
                        ~{levelData.sessions} sessions
                      </Text>
                    </View>
                  </View>
                )}

                {levelData.unlocks.length > 0 && (
                  <View style={styles.unlocksSection}>
                    <Text style={styles.unlocksTitle}>🎉 Unlocks:</Text>
                    {levelData.unlocks.map((unlock, idx) => (
                      <View key={idx} style={styles.unlockItem}>
                        <Text style={styles.unlockIcon}>{unlock.icon}</Text>
                        <Text style={styles.unlockName}>{unlock.name}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            );
          })}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: '#F5F9FF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    color: '#2C3E50',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F5F9FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoSection: {
    padding: 20,
    gap: 12,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 12,
    gap: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  infoText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2C3E50',
  },
  xpExplanation: {
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  xpExplanationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  xpExplanationTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1f89ee',
  },
  xpRule: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  xpRuleIcon: {
    fontSize: 18,
  },
  xpRuleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2C3E50',
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  levelCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  currentLevelCard: {
    borderWidth: 2,
    borderColor: '#1f89ee',
    backgroundColor: '#EFF6FF',
  },
  passedLevelCard: {
    opacity: 0.7,
  },
  levelHeader: {
    marginBottom: 12,
  },
  levelTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  levelNumber: {
    fontSize: 20,
    fontWeight: '900',
    color: '#2C3E50',
  },
  currentLevelNumber: {
    color: '#1f89ee',
  },
  passedLevelNumber: {
    color: '#31af4d',
  },
  currentBadge: {
    backgroundColor: '#1f89ee',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
  },
  currentBadgeText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#FFF',
    letterSpacing: 0.5,
  },
  requirementsSection: {
    backgroundColor: '#F5F9FF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    gap: 8,
  },
  requirementRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  requirementLabel: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '600',
  },
  requirementValue: {
    fontSize: 14,
    color: '#2C3E50',
    fontWeight: '800',
  },
  unlocksSection: {
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },
  unlocksTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#92400E',
    marginBottom: 4,
  },
  unlockItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  unlockIcon: {
    fontSize: 18,
  },
  unlockName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2C3E50',
  },
});
