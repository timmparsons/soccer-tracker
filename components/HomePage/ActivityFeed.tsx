import CheerRow from '@/components/HomePage/CheerRow';
import { useCheersForItems, useMyReactions } from '@/hooks/useFeedCheers';
import { TeamActivityItem, useActivityFeed } from '@/hooks/useTeamActivity';
import { FeedBadgeTone } from '@/lib/activityFeedCopy';
import { useProfile } from '@/hooks/useProfile';
import { useUser } from '@/hooks/useUser';
import { formatTimeAgo } from '@/utils/formatTimeAgo';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
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

const EMPTY_ACTIVITY: TeamActivityItem[] = [];

const badgeStyles: Record<FeedBadgeTone, { backgroundColor: string }> = {
  blue: { backgroundColor: '#EFF6FF' },
  green: { backgroundColor: '#E8F7EC' },
};
const badgeColors: Record<FeedBadgeTone, string> = {
  blue: '#1f89ee',
  green: '#238a3b',
};

const ActivityFeed = () => {
  const { data: rawActivity } = useActivityFeed(15);
  const activity = rawActivity ?? EMPTY_ACTIVITY;
  const { data: user } = useUser();
  const router = useRouter();
  const { data: profile } = useProfile(user?.id);

  // Hold the feed still while new items land in the background (realtime),
  // rather than reshuffling rows out from under a user mid-scroll — surface
  // a "N new" pill instead and only swap in the latest data when it's tapped.
  const [displayed, setDisplayed] = useState<TeamActivityItem[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const displayedRef = useRef<TeamActivityItem[]>([]);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (rawActivity === undefined) return;
    if (!initializedRef.current) {
      initializedRef.current = true;
      displayedRef.current = rawActivity;
      setDisplayed(rawActivity);
      return;
    }
    const seenIds = new Set(displayedRef.current.map((item) => item.id));
    const newCount = rawActivity.filter((item) => !seenIds.has(item.id)).length;
    if (newCount > 0) {
      setPendingCount(newCount);
    } else {
      displayedRef.current = rawActivity;
      setDisplayed(rawActivity);
    }
  }, [rawActivity]);

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
            <TouchableOpacity
              style={styles.row}
              onPress={() => router.push(`/player/${item.userId}`)}
              activeOpacity={0.7}
            >
              <Image
                source={{ uri: item.avatarUrl || FALLBACK_AVATAR }}
                style={styles.avatar}
              />
              <View style={styles.info}>
                <Text style={styles.message}>
                  {item.message}
                  {item.isGameSpeed && ' '}
                  {item.isGameSpeed && (
                    <Ionicons name='flame' size={14} color='#B23B00' />
                  )}
                </Text>
                <Text style={styles.detail} numberOfLines={1}>
                  {formatTimeAgo(item.createdAt)}
                  {item.subtitle && ` · ${item.subtitle}`}
                </Text>
                {!!item.chips?.length && (
                  <View style={styles.chipRow}>
                    {item.chips.map((chip) => (
                      <View key={chip.label} style={styles.chip}>
                        <Ionicons name={chip.icon} size={12} color='#78909C' />
                        <Text style={styles.chipText}>{chip.label}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
              {item.badge && (
                <View style={[styles.badge, badgeStyles[item.badge.tone]]}>
                  <Ionicons name={item.badge.icon} size={14} color={badgeColors[item.badge.tone]} />
                  <Text style={[styles.badgeText, { color: badgeColors[item.badge.tone] }]}>
                    {item.badge.label}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
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
  message: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1a1a2e',
  },
  detail: {
    fontSize: 12,
    fontWeight: '600',
    color: '#78909C',
    marginTop: 2,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: '#E3EAF2',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  chipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4A5A6A',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    maxWidth: 104,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  badgeText: {
    flexShrink: 1,
    fontSize: 11,
    fontWeight: '800',
  },
});
