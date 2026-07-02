import CheerRow from '@/components/HomePage/CheerRow';
import { useCheersForItems, useMyCheerKeys } from '@/hooks/useFeedCheers';
import { useActivityFeed } from '@/hooks/useTeamActivity';
import { useProfile } from '@/hooks/useProfile';
import { useUser } from '@/hooks/useUser';
import { formatTimeAgo } from '@/utils/formatTimeAgo';
import { useMemo } from 'react';
import {
  Image,
  StyleSheet,
  Text,
  View,
} from 'react-native';

const FALLBACK_AVATAR =
  'https://cdn-icons-png.flaticon.com/512/4140/4140037.png';

const ActivityFeed = () => {
  const { data: activity = [] } = useActivityFeed(7);
  const { data: user } = useUser();
  const { data: profile } = useProfile(user?.id);
  const feedItemKeys = useMemo(() => activity.map((item) => item.id), [activity]);
  const { data: cheersMap = new Map() } = useCheersForItems(feedItemKeys);
  const { data: myCheerKeys = new Set<string>() } = useMyCheerKeys(user?.id);

  if (activity.length === 0) return null;

  return (
    <View style={styles.card}>
      <Text style={styles.label}>Activity</Text>
      {activity.map((item, i) => {
        const isOwn = item.userId === user?.id;
        const isCoach = !!profile?.is_coach;
        return (
          <View
            key={item.id}
            style={[styles.itemWrap, i < activity.length - 1 && styles.itemBorder]}
          >
            <View style={styles.row}>
              <Image
                source={{ uri: item.avatarUrl || FALLBACK_AVATAR }}
                style={styles.avatar}
              />
              <View style={styles.info}>
                <Text style={styles.message}>{item.message}</Text>
                <Text style={styles.detail}>{formatTimeAgo(item.createdAt)}</Text>
              </View>
            </View>
            {!isOwn && !isCoach && user?.id && (
              <CheerRow
                feedItemKey={item.id}
                recipientId={item.userId}
                userId={user.id}
                cheerData={cheersMap.get(item.id)}
                alreadyCheered={myCheerKeys.has(item.id)}
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
  itemWrap: {
    paddingVertical: 10,
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
});
