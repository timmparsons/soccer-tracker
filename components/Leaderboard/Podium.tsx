import { Ionicons } from '@expo/vector-icons';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export interface PodiumEntry {
  id: string;
  name: string;
  avatarUrl: string | null;
  value: number;
  targetHit?: boolean;
  streak?: number;
}

interface Props {
  entries: PodiumEntry[];
  onPressEntry: (id: string) => void;
  formatValue?: (value: number) => string;
}

const FALLBACK_AVATAR =
  'https://cdn-icons-png.flaticon.com/512/4140/4140037.png';

const RANK_STYLES: Record<
  number,
  { bg: string; text: string; avatarBorder: string; large: boolean }
> = {
  1: { bg: '#FFD700', text: '#7A5900', avatarBorder: '#FFD700', large: true },
  2: { bg: '#C0C0C0', text: '#4A4A4A', avatarBorder: '#C0C0C0', large: false },
  3: { bg: '#CD7F32', text: '#5C3A1E', avatarBorder: '#CD7F32', large: false },
};

const PodiumSpot = ({
  entry,
  rank,
  onPress,
  formatValue,
}: {
  entry: PodiumEntry;
  rank: number;
  onPress: () => void;
  formatValue: (value: number) => string;
}) => {
  const rankStyle = RANK_STYLES[rank];
  return (
    <TouchableOpacity
      style={[styles.podiumSpot, rank === 1 && styles.podiumFirst]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {rank === 1 && (
        <View style={styles.trophyContainer}>
          <Ionicons name='trophy' size={28} color='#FFD700' />
        </View>
      )}
      <View style={styles.podiumAvatarContainer}>
        <Image
          source={{ uri: entry.avatarUrl || FALLBACK_AVATAR }}
          style={[
            rankStyle.large ? styles.podiumAvatarLg : styles.podiumAvatarMd,
            { borderColor: rankStyle.avatarBorder },
          ]}
        />
        {entry.targetHit && (
          <Text style={styles.podiumTargetIcon}>🎯</Text>
        )}
      </View>
      <View style={[styles.rankBadge, { backgroundColor: rankStyle.bg }]}>
        <Text style={[styles.rankBadgeText, { color: rankStyle.text }]}>
          {rank}
        </Text>
      </View>
      <Text style={styles.podiumName} numberOfLines={1}>
        {entry.name}
      </Text>
      <Text style={styles.podiumValue}>{formatValue(entry.value)}</Text>
      {!!entry.streak && entry.streak >= 2 && (
        <View style={styles.podiumStreak}>
          <Ionicons name='flame' size={11} color='#ffb724' />
          <Text style={styles.podiumStreakText}>{entry.streak}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const Podium = ({
  entries,
  onPressEntry,
  formatValue = (v) => v.toLocaleString(),
}: Props) => {
  const count = Math.min(entries.length, 3);
  if (count === 0) return null;
  const [first, second, third] = entries;

  return (
    <View style={styles.podium}>
      {(count === 1 || count === 2) && (
        <PodiumSpot
          entry={first}
          rank={1}
          onPress={() => onPressEntry(first.id)}
          formatValue={formatValue}
        />
      )}
      {count >= 2 && (
        <PodiumSpot
          entry={second}
          rank={2}
          onPress={() => onPressEntry(second.id)}
          formatValue={formatValue}
        />
      )}
      {count === 3 && (
        <PodiumSpot
          entry={first}
          rank={1}
          onPress={() => onPressEntry(first.id)}
          formatValue={formatValue}
        />
      )}
      {count >= 3 && (
        <PodiumSpot
          entry={third}
          rank={3}
          onPress={() => onPressEntry(third.id)}
          formatValue={formatValue}
        />
      )}
    </View>
  );
};

export default Podium;

const styles = StyleSheet.create({
  podium: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    marginBottom: 24,
    gap: 16,
    backgroundColor: '#EFF6FF',
    borderRadius: 24,
    paddingTop: 20,
    paddingBottom: 20,
    paddingHorizontal: 8,
  },
  podiumSpot: {
    alignItems: 'center',
    flex: 1,
  },
  podiumFirst: {
    marginBottom: 20,
  },
  trophyContainer: {
    marginBottom: 8,
  },
  podiumAvatarContainer: {
    position: 'relative',
  },
  podiumAvatarLg: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    marginBottom: 8,
  },
  podiumAvatarMd: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 4,
    marginBottom: 8,
  },
  podiumTargetIcon: {
    position: 'absolute',
    top: 0,
    right: 0,
    fontSize: 16,
  },
  rankBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  rankBadgeText: {
    fontSize: 13,
    fontWeight: '900',
  },
  podiumName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1a1a2e',
    marginBottom: 4,
    textAlign: 'center',
  },
  podiumValue: {
    fontSize: 20,
    fontWeight: '900',
    color: '#1f89ee',
  },
  podiumStreak: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 4,
  },
  podiumStreakText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#ffb724',
  },
});
