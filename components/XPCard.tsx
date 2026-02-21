// components/XPCard.tsx
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface XPCardProps {
  level: number;
  xpIntoLevel: number;
  xpForNextLevel: number;
  rankName: string;
  onOpenRoadmap: () => void;
}

export default function XPCard({
  level,
  xpIntoLevel,
  xpForNextLevel,
  rankName,
  onOpenRoadmap,
}: XPCardProps) {
  const progressPercent = (xpIntoLevel / xpForNextLevel) * 100;

  return (
    <View style={styles.container}>
      {/* Level & Rank */}
      <View style={styles.header}>
        <View style={styles.levelBadge}>
          <Text style={styles.levelLabel}>LEVEL</Text>
          <Text style={styles.levelNumber}>{level}</Text>
        </View>
        <View style={styles.rankContainer}>
          <Text style={styles.rankLabel}>RANK</Text>
          <Text style={styles.rankName}>{rankName}</Text>
        </View>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressSection}>
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              { width: `${Math.min(progressPercent, 100)}%` },
            ]}
          />
        </View>
        <Text style={styles.progressText}>
          {xpIntoLevel.toLocaleString()} / {xpForNextLevel.toLocaleString()} XP
        </Text>
      </View>

      {/* XP Info */}
      <View style={styles.xpInfo}>
        <View style={styles.xpInfoRow}>
          <Ionicons name='football' size={18} color='#2B9FFF' />
          <Text style={styles.xpInfoText}>10 juggles = 1 XP</Text>
        </View>
        <View style={styles.xpInfoRow}>
          <Ionicons name='trophy' size={18} color='#FFD700' />
          <Text style={styles.xpInfoText}>Personal Best = +50 XP</Text>
        </View>
      </View>

      {/* Roadmap Button */}
      <TouchableOpacity style={styles.roadmapButton} onPress={onOpenRoadmap}>
        <Ionicons name='map' size={20} color='#FFF' />
        <Text style={styles.roadmapButtonText}>View Roadmap</Text>
        <Ionicons name='chevron-forward' size={20} color='#FFF' />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  levelBadge: {
    backgroundColor: '#2B9FFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 16,
    alignItems: 'center',
    minWidth: 100,
    shadowColor: '#2B9FFF',
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
    fontSize: 32,
    fontWeight: '900',
    color: '#FFF',
    marginTop: 4,
  },
  rankContainer: {
    flex: 1,
    marginLeft: 16,
    justifyContent: 'center',
  },
  rankLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#9CA3AF',
    letterSpacing: 1,
    marginBottom: 4,
  },
  rankName: {
    fontSize: 20,
    fontWeight: '900',
    color: '#2C3E50',
  },
  progressSection: {
    marginBottom: 16,
  },
  progressBar: {
    height: 12,
    backgroundColor: '#F3F4F6',
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#FFA500',
    borderRadius: 6,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6B7280',
    textAlign: 'center',
  },
  xpInfo: {
    backgroundColor: '#F5F9FF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    gap: 8,
  },
  xpInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  xpInfoText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2C3E50',
  },
  roadmapButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FFA500',
    paddingVertical: 14,
    borderRadius: 12,
    shadowColor: '#FFA500',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  roadmapButtonText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFF',
    letterSpacing: 0.3,
  },
});
