import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface Props {
  rank: number;
  deficit: number;
  unitLabel: string;
}

const StickyRankBanner = ({ rank, deficit, unitLabel }: Props) => {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.banner, { paddingBottom: insets.bottom + 12 }]}>
      <View style={styles.rankPill}>
        <Text style={styles.rankPillText}>#{rank}</Text>
      </View>
      <Text style={styles.deficitText} numberOfLines={1}>
        {deficit.toLocaleString()} {unitLabel} to pass the next spot
      </Text>
      <Ionicons name='trending-up' size={20} color='#1f89ee' />
    </View>
  );
};

export default StickyRankBanner;

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#EEF2F6',
    paddingHorizontal: 20,
    paddingTop: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 6,
  },
  rankPill: {
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  rankPillText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#1f89ee',
  },
  deficitText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: '#1a1a2e',
  },
});
