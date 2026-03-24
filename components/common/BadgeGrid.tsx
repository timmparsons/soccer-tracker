import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import type { Badge } from '@/hooks/useBadges';

interface BadgeGridProps {
  allBadges: Badge[];
  earnedIds: Set<string>;
  compact?: boolean; // show fewer per row for modals
}

export default function BadgeGrid({ allBadges, earnedIds, compact = false }: BadgeGridProps) {
  return (
    <View style={[styles.grid, compact && styles.gridCompact]}>
      {allBadges.map((badge) => {
        const isEarned = earnedIds.has(badge.id);
        return (
          <View key={badge.id} style={styles.badgeItem}>
            <View
              style={[
                styles.badgeIcon,
                compact && styles.badgeIconCompact,
                isEarned
                  ? { backgroundColor: badge.color + '22', borderColor: badge.color }
                  : styles.badgeIconLocked,
              ]}
            >
              <Ionicons
                name={badge.icon as any}
                size={compact ? 18 : 22}
                color={isEarned ? badge.color : '#C4C4C4'}
              />
              {!isEarned && (
                <View style={styles.lockOverlay}>
                  <Ionicons name='lock-closed' size={9} color='#9CA3AF' />
                </View>
              )}
            </View>
            <Text
              style={[styles.badgeName, !isEarned && styles.badgeNameLocked]}
              numberOfLines={2}
            >
              {badge.name}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  gridCompact: {
    gap: 8,
  },
  badgeItem: {
    width: '22%',
    alignItems: 'center',
    gap: 6,
  },
  badgeIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeIconCompact: {
    width: 42,
    height: 42,
    borderRadius: 21,
  },
  badgeIconLocked: {
    backgroundColor: '#F3F4F6',
    borderColor: '#E5E7EB',
  },
  lockOverlay: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#FFF',
    borderRadius: 8,
    padding: 1,
  },
  badgeName: {
    fontSize: 10,
    fontWeight: '600',
    color: '#374151',
    textAlign: 'center',
    lineHeight: 13,
  },
  badgeNameLocked: {
    color: '#9CA3AF',
  },
});
