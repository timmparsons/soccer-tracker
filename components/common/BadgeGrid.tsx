import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { Badge } from '@/hooks/useBadges';

interface BadgeGridProps {
  allBadges: Badge[];
  earnedIds: Set<string>;
  compact?: boolean;
  dark?: boolean;
  badgeCounts?: Record<string, number>;
  onBadgePress?: (badge: Badge, isEarned: boolean) => void;
}

export default function BadgeGrid({
  allBadges,
  earnedIds,
  compact = false,
  dark = false,
  badgeCounts,
  onBadgePress,
}: BadgeGridProps) {
  return (
    <View style={[styles.grid, compact && styles.gridCompact]}>
      {allBadges.map((badge) => {
        const isEarned = earnedIds.has(badge.id);
        const count = badgeCounts?.[badge.id] ?? 1;
        const showCount = isEarned && count > 1;

        return (
          <TouchableOpacity
            key={badge.id}
            style={styles.badgeItem}
            onPress={() => onBadgePress?.(badge, isEarned)}
            activeOpacity={onBadgePress ? 0.7 : 1}
            disabled={!onBadgePress}
          >
            <View
              style={[
                styles.badgeIcon,
                compact && styles.badgeIconCompact,
                isEarned
                  ? { backgroundColor: badge.color + '22', borderColor: badge.color }
                  : dark ? styles.badgeIconLockedDark : styles.badgeIconLocked,
              ]}
            >
              <Ionicons
                name={badge.icon as any}
                size={compact ? 18 : 22}
                color={isEarned ? badge.color : dark ? '#4B5563' : '#C4C4C4'}
              />
              {!isEarned && (
                <View style={[styles.cornerBadge, dark && styles.lockOverlayDark]}>
                  <Ionicons name='lock-closed' size={9} color={dark ? '#6B7280' : '#9CA3AF'} />
                </View>
              )}
              {showCount && (
                <View style={[styles.cornerBadge, { backgroundColor: badge.color }]}>
                  <Text style={styles.countText}>×{count}</Text>
                </View>
              )}
            </View>
            <Text
              style={[styles.badgeName, !isEarned && (dark ? styles.badgeNameLockedDark : styles.badgeNameLocked)]}
              numberOfLines={2}
            >
              {badge.name}
            </Text>
          </TouchableOpacity>
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
  badgeIconLockedDark: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderColor: 'rgba(255,255,255,0.1)',
  },
  cornerBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#FFF',
    borderRadius: 8,
    paddingHorizontal: 3,
    paddingVertical: 1,
    minWidth: 16,
    alignItems: 'center',
  },
  lockOverlayDark: {
    backgroundColor: '#1E1A3A',
  },
  countText: {
    fontSize: 8,
    fontWeight: '900',
    color: '#FFF',
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
  badgeNameLockedDark: {
    color: 'rgba(255,255,255,0.3)',
  },
});
