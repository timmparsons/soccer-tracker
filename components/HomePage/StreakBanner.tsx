import { isStreakInDanger } from '@/lib/streakDanger';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface StreakBannerProps {
  streak: number;
  todayTouches: number;
  onPress: () => void;
}

const StreakBanner = ({ streak, todayTouches, onPress }: StreakBannerProps) => {
  if (streak <= 0) return null;

  const trainedToday = todayTouches > 0;
  const danger = !trainedToday && isStreakInDanger(streak, todayTouches);

  let title: string;
  let message: string;
  if (trainedToday) {
    title = `${streak}-Day Streak`;
    message = 'Locked in for today';
  } else if (danger) {
    title = `${streak}-Day Streak`;
    message = 'At risk. Log today';
  } else {
    title = `${streak}-Day Streak`;
    message = 'Log today to keep it going';
  }

  return (
    <TouchableOpacity
      style={[styles.banner, danger && styles.bannerDanger, trainedToday && styles.bannerLocked]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <Ionicons name='flame' size={22} color={danger || trainedToday ? '#FFFFFF' : '#ffb724'} />
      <Text style={styles.textBold}>{title}</Text>
      <View style={styles.divider} />
      <Text style={styles.textDim} numberOfLines={1}>{message}</Text>
      <Ionicons name='chevron-forward' size={16} color='rgba(255,255,255,0.75)' />
    </TouchableOpacity>
  );
};

export default StreakBanner;

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(11,45,110,0.18)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.4)',
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  bannerDanger: {
    backgroundColor: '#E5484D',
    borderColor: '#E5484D',
  },
  bannerLocked: {
    backgroundColor: '#31af4d',
    borderColor: '#31af4d',
  },
  divider: {
    width: 1,
    height: 18,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  textBold: {
    fontSize: 15,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  textDim: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.9)',
  },
});
