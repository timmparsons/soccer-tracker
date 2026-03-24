import BadgeGrid from '@/components/common/BadgeGrid';
import { useAllBadges, useUserBadges } from '@/hooks/useBadges';
import { useProfile } from '@/hooks/useProfile';
import { useJugglingRecord, useTouchTracking } from '@/hooks/useTouchTracking';
import { getLevelFromXp, getRankName } from '@/lib/xp';
import { Ionicons } from '@expo/vector-icons';
import {
  ActivityIndicator,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface PlayerProfileModalProps {
  playerId: string | null;
  visible: boolean;
  onClose: () => void;
}

export default function PlayerProfileModal({ playerId, visible, onClose }: PlayerProfileModalProps) {
  const insets = useSafeAreaInsets();
  const { data: profile } = useProfile(playerId ?? undefined);
  const { data: touchStats } = useTouchTracking(playerId ?? undefined);
  const { data: jugglePB = 0 } = useJugglingRecord(playerId ?? undefined);
  const { data: allBadges = [] } = useAllBadges();
  const { data: userBadges = [] } = useUserBadges(playerId ?? undefined);

  const earnedBadgeIds = new Set(userBadges.map((b) => b.badge_id));
  const { level } = getLevelFromXp(profile?.total_xp ?? 0);
  const rank = getRankName(level);

  const isLoading = !profile;

  return (
    <Modal
      visible={visible}
      animationType='slide'
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
          {/* Handle */}
          <View style={styles.handle} />

          {/* Close button */}
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Ionicons name='close' size={20} color='#6B7280' />
          </TouchableOpacity>

          {isLoading ? (
            <ActivityIndicator style={styles.loader} color='#1f89ee' />
          ) : (
            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Avatar + name */}
              <View style={styles.header}>
                <Image
                  source={{
                    uri: profile?.avatar_url || 'https://cdn-icons-png.flaticon.com/512/4140/4140037.png',
                  }}
                  style={styles.avatar}
                />
                <Text style={styles.name}>{profile?.display_name || profile?.name}</Text>
                <View style={styles.rankPill}>
                  <Text style={styles.rankText}>Level {level} · {rank}</Text>
                </View>
              </View>

              {/* Stats row */}
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{(profile?.total_xp ?? 0).toLocaleString()}</Text>
                  <Text style={styles.statLabel}>XP</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{touchStats?.current_streak ?? 0}</Text>
                  <Text style={styles.statLabel}>Day Streak</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{(touchStats?.total_touches ?? 0).toLocaleString()}</Text>
                  <Text style={styles.statLabel}>Total Touches</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{jugglePB}</Text>
                  <Text style={styles.statLabel}>Juggle PB</Text>
                </View>
              </View>

              {/* Badges */}
              <View style={styles.badgesSection}>
                <View style={styles.badgesHeader}>
                  <Text style={styles.badgesTitle}>Badges</Text>
                  <Text style={styles.badgesCount}>
                    {earnedBadgeIds.size}/{allBadges.length}
                  </Text>
                </View>
                <BadgeGrid allBadges={allBadges} earnedIds={earnedBadgeIds} compact />
              </View>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    maxHeight: '85%',
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 20,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loader: {
    marginVertical: 60,
  },
  header: {
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 20,
    gap: 8,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: '#1f89ee',
  },
  name: {
    fontSize: 22,
    fontWeight: '900',
    color: '#1a1a2e',
  },
  rankPill: {
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  rankText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1f89ee',
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: '#F5F7FA',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '900',
    color: '#1a1a2e',
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#78909C',
    textAlign: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 4,
  },
  badgesSection: {
    marginBottom: 20,
  },
  badgesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  badgesTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#1a1a2e',
  },
  badgesCount: {
    fontSize: 13,
    fontWeight: '700',
    color: '#78909C',
  },
});
