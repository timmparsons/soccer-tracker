import { isStreakInDanger } from '@/lib/streakDanger';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';

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
    title = `${streak}-Day Streak Locked In!`;
    message = 'See you tomorrow';
  } else if (danger) {
    title = `${streak}-Day Streak at Risk`;
    message = 'Log today to keep it alive';
  } else {
    title = `${streak}-Day Streak Active`;
    message = 'Log today to keep it';
  }

  return (
    <TouchableOpacity
      style={[styles.banner, danger && styles.bannerDanger, trainedToday && styles.bannerLocked]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <Ionicons name='flame' size={20} color={danger || trainedToday ? '#FFFFFF' : '#ffb724'} />
      <Text style={styles.text}>
        <Text style={styles.textBold}>{title}</Text>
        <Text style={styles.textDim}>{' · '}{message}</Text>
      </Text>
    </TouchableOpacity>
  );
};

export default StreakBanner;

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#1a1a2e',
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  bannerDanger: {
    backgroundColor: '#E5484D',
  },
  bannerLocked: {
    backgroundColor: '#31af4d',
  },
  text: {
    flex: 1,
    fontSize: 13,
  },
  textBold: {
    fontWeight: '900',
    color: '#FFFFFF',
  },
  textDim: {
    fontWeight: '700',
    color: 'rgba(255,255,255,0.75)',
  },
});
