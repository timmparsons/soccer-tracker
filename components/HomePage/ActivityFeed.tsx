import {
  toggleReaction,
  useMyReactionKeys,
} from '@/hooks/useActivityReactions';
import { useActivityFeed } from '@/hooks/useTeamActivity';
import { useProfile } from '@/hooks/useProfile';
import { useUser } from '@/hooks/useUser';
import { getDisplayName } from '@/utils/getDisplayName';
import { formatTimeAgo } from '@/utils/formatTimeAgo';
import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import React, { useState } from 'react';
import {
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const FALLBACK_AVATAR =
  'https://cdn-icons-png.flaticon.com/512/4140/4140037.png';

const ActivityFeed = () => {
  const { data: activity = [] } = useActivityFeed(7);
  const { data: user } = useUser();
  const { data: profile } = useProfile(user?.id);
  const { data: myReactionKeys = new Set<string>() } = useMyReactionKeys(user?.id);
  const queryClient = useQueryClient();
  const [localReacted, setLocalReacted] = useState<Set<string>>(new Set());

  const reactorName = getDisplayName(profile);

  const handleThumbsUp = async (item: (typeof activity)[0]) => {
    if (!user?.id || item.userId === user.id) return;
    const alreadyReacted = myReactionKeys.has(item.id) || localReacted.has(item.id);
    setLocalReacted((prev) => {
      const next = new Set(prev);
      alreadyReacted ? next.delete(item.id) : next.add(item.id);
      return next;
    });
    await toggleReaction({
      activityKey: item.id,
      recipientId: item.userId,
      reactorId: user.id,
      reactorName,
      alreadyReacted,
    });
    queryClient.invalidateQueries({ queryKey: ['my-reaction-keys', user.id] });
  };

  if (activity.length === 0) return null;

  return (
    <View style={styles.card}>
      <Text style={styles.label}>Activity</Text>
      {activity.map((item, i) => {
        const isOwn = item.userId === user?.id;
        const reacted = myReactionKeys.has(item.id) || localReacted.has(item.id);
        return (
          <View
            key={item.id}
            style={[styles.row, i < activity.length - 1 && styles.rowBorder]}
          >
            <Image
              source={{ uri: item.avatarUrl || FALLBACK_AVATAR }}
              style={styles.avatar}
            />
            <View style={styles.info}>
              <Text style={styles.message}>{item.message}</Text>
              <Text style={styles.detail}>{formatTimeAgo(item.createdAt)}</Text>
            </View>
            {!isOwn && (
              <TouchableOpacity
                onPress={() => handleThumbsUp(item)}
                style={styles.thumbBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons
                  name={reacted ? 'thumbs-up' : 'thumbs-up-outline'}
                  size={18}
                  color={reacted ? '#1f89ee' : '#B0BEC5'}
                />
              </TouchableOpacity>
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 12,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F0F4F8',
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
  thumbBtn: {
    padding: 4,
  },
});
