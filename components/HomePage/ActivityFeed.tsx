import CheerRow from '@/components/HomePage/CheerRow';
import { useCheersForItems, useMyReactions } from '@/hooks/useFeedCheers';
import { ActivityIntensity, TeamActivityItem, useActivityFeed } from '@/hooks/useTeamActivity';
import { useProfile } from '@/hooks/useProfile';
import { useUser } from '@/hooks/useUser';
import { formatTimeAgo } from '@/utils/formatTimeAgo';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const FALLBACK_AVATAR =
  'https://cdn-icons-png.flaticon.com/512/4140/4140037.png';

const intensityLabels: Record<ActivityIntensity, string> = {
  light: 'Light Pace',
  moderate: 'Moderate Pace',
  intense: 'Intense Pace',
};
const intensityStyles: Record<ActivityIntensity, { backgroundColor: string }> = {
  light: { backgroundColor: '#F0F4F8' },
  moderate: { backgroundColor: '#EFF6FF' },
  intense: { backgroundColor: '#FFF1E8' },
};
const intensityTextStyles: Record<ActivityIntensity, { color: string }> = {
  light: { color: '#78909C' },
  moderate: { color: '#1f89ee' },
  intense: { color: '#B23B00' },
};

const ActivityFeed = () => {
  const { data: activity = [] } = useActivityFeed(15);
  const { data: user } = useUser();
  const { data: profile } = useProfile(user?.id);

  // Hold the feed still while new items land in the background (realtime),
  // rather than reshuffling rows out from under a user mid-scroll — surface
  // a "N new" pill instead and only swap in the latest data when it's tapped.
  const [displayed, setDisplayed] = useState<TeamActivityItem[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const displayedRef = useRef<TeamActivityItem[]>([]);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!initializedRef.current) {
      initializedRef.current = true;
      displayedRef.current = activity;
      setDisplayed(activity);
      return;
    }
    const seenIds = new Set(displayedRef.current.map((item) => item.id));
    const newCount = activity.filter((item) => !seenIds.has(item.id)).length;
    if (newCount > 0) {
      setPendingCount(newCount);
    } else {
      displayedRef.current = activity;
      setDisplayed(activity);
    }
  }, [activity]);

  const showNewActivity = () => {
    displayedRef.current = activity;
    setDisplayed(activity);
    setPendingCount(0);
  };

  const feedItemKeys = useMemo(() => displayed.map((item) => item.id), [displayed]);
  const { data: cheersMap = new Map() } = useCheersForItems(feedItemKeys);
  const { data: myReactions = new Map(), isLoading: cheerKeysLoading } = useMyReactions(user?.id);

  if (displayed.length === 0 && pendingCount === 0) return null;

  return (
    <View style={styles.card}>
      <Text style={styles.label}>Activity</Text>
      {pendingCount > 0 && (
        <TouchableOpacity style={styles.newActivityPill} onPress={showNewActivity} activeOpacity={0.8}>
          <Ionicons name='arrow-up' size={13} color='#FFFFFF' />
          <Text style={styles.newActivityPillText}>
            {pendingCount} new {pendingCount === 1 ? 'update' : 'updates'}
          </Text>
        </TouchableOpacity>
      )}
      {displayed.map((item, i) => {
        const isOwn = item.userId === user?.id;
        const isCoach = !!profile?.is_coach;
        return (
          <View
            key={item.id}
            style={[
              styles.itemWrap,
              i < displayed.length - 1 && styles.itemBorder,
              item.isMilestone && styles.itemMilestone,
            ]}
          >
            <View style={styles.row}>
              <Image
                source={{ uri: item.avatarUrl || FALLBACK_AVATAR }}
                style={styles.avatar}
              />
              <View style={styles.info}>
                <View style={styles.messageRow}>
                  {item.isMilestone && (
                    <Ionicons name='trophy' size={14} color='#ffb724' style={styles.milestoneIcon} />
                  )}
                  <Text style={styles.message}>{item.message}</Text>
                  {item.isGameSpeed && (
                    <Ionicons name='flame' size={16} color='#B23B00' style={styles.gameSpeedIcon} />
                  )}
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detail}>{formatTimeAgo(item.createdAt)}</Text>
                  {item.intensity && (
                    <View style={[styles.intensityBadge, intensityStyles[item.intensity]]}>
                      <Text style={[styles.intensityBadgeText, intensityTextStyles[item.intensity]]}>
                        {intensityLabels[item.intensity]}
                      </Text>
                    </View>
                  )}
                  {!!item.streak && item.streak >= 2 && (
                    <View style={styles.streakTag}>
                      <Ionicons name='flame' size={11} color='#ffb724' />
                      <Text style={styles.streakTagText}>{item.streak}</Text>
                    </View>
                  )}
                </View>
              </View>
            </View>
            {!isOwn && !isCoach && user?.id && (
              <CheerRow
                feedItemKey={item.id}
                recipientId={item.userId}
                userId={user.id}
                cheerData={cheersMap.get(item.id)}
                myReaction={myReactions.get(item.id)}
                disabled={cheerKeysLoading}
              />
            )}
          </View>
        );
      })}
    </View>
  );
};

export default ActivityFeed;

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  label: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1a1a2e',
    marginBottom: 12,
  },
  newActivityPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    gap: 6,
    backgroundColor: '#1f89ee',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 7,
    marginBottom: 10,
    marginTop: -4,
  },
  newActivityPillText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  itemWrap: {
    paddingVertical: 10,
    paddingHorizontal: 10,
    marginHorizontal: -10,
    borderRadius: 12,
  },
  itemMilestone: {
    backgroundColor: '#FFF8E8',
  },
  itemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F0F4F8',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#EFF6FF',
  },
  info: {
    flex: 1,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  message: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1a1a2e',
    flexShrink: 1,
  },
  gameSpeedIcon: {
    marginTop: 2,
  },
  milestoneIcon: {
    marginTop: 2,
  },
  detail: {
    fontSize: 12,
    fontWeight: '600',
    color: '#78909C',
    marginTop: 2,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  intensityBadge: {
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 1,
    marginTop: 2,
  },
  intensityBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  streakTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginTop: 2,
  },
  streakTagText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#ffb724',
  },
});
