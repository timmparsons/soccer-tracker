import { useTeamActivity } from '@/hooks/useTeamActivity';
import { formatTimeAgo } from '@/utils/formatTimeAgo';
import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

const FALLBACK_AVATAR =
  'https://cdn-icons-png.flaticon.com/512/4140/4140037.png';

const ActivityFeed = ({ teamId }: { teamId: string | undefined }) => {
  const { data: activity = [] } = useTeamActivity(teamId, 7);

  if (!teamId || activity.length === 0) return null;

  return (
    <View style={styles.card}>
      <Text style={styles.label}>Team Activity</Text>
      {activity.map((item, i) => (
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
        </View>
      ))}
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
});
