import type { WeekDay } from '@/hooks/useTouchTracking';
import { getStreakMilestone } from '@/lib/streakMilestones';
import { Ionicons } from '@expo/vector-icons';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface StreakModalProps {
  visible: boolean;
  onClose: () => void;
  streak: number;
  freezesAvailable: number;
  weekActivity: WeekDay[];
}

const DAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export default function StreakModal({
  visible,
  onClose,
  streak,
  freezesAvailable,
  weekActivity,
}: StreakModalProps) {
  const milestone = getStreakMilestone(streak);
  const isDayOne = streak <= 1;
  const daysToTarget = Math.max(0, milestone.target - streak);

  const message = isDayOne
    ? 'Log again the next 2 days to hit a 3-day streak.'
    : daysToTarget === 0
      ? `${milestone.label} — new target ahead.`
      : `${daysToTarget} more day${daysToTarget === 1 ? '' : 's'} to reach a ${milestone.target}-day streak.`;

  return (
    <Modal visible={visible} animationType='fade' transparent hardwareAccelerated onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.iconRing}>
            <Ionicons name='flame' size={40} color='#FFFFFF' />
          </View>

          <Text style={styles.streakNumber}>{streak}</Text>
          <Text style={styles.streakLabel}>DAY STREAK</Text>

          <View style={styles.weekRow}>
            {weekActivity.map((day) => (
              <View key={day.date} style={styles.dayCol}>
                <Text style={styles.dayLetter}>{DAY_LETTERS[day.dayOfWeek]}</Text>
                <View
                  style={[
                    styles.dayDot,
                    day.status === 'done' && styles.dayDotDone,
                    day.status === 'frozen' && styles.dayDotFrozen,
                    day.isToday && day.status !== 'done' && styles.dayDotToday,
                  ]}
                >
                  {day.status === 'done' && <Ionicons name='checkmark' size={16} color='#1f89ee' />}
                  {day.status === 'frozen' && <Ionicons name='snow' size={14} color='#FFFFFF' />}
                </View>
              </View>
            ))}
          </View>

          <Text style={styles.message}>{message}</Text>

          {freezesAvailable > 0 && (
            <View style={styles.freezeRow}>
              <Ionicons name='snow' size={14} color='#FFFFFF' />
              <Text style={styles.freezeText}>
                {freezesAvailable} streak freeze{freezesAvailable === 1 ? '' : 's'} banked
              </Text>
            </View>
          )}

          <TouchableOpacity style={styles.button} onPress={onClose} activeOpacity={0.85}>
            <Text style={styles.buttonText}>LET&apos;S GO</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: '#1f89ee',
    borderRadius: 32,
    paddingHorizontal: 24,
    paddingTop: 36,
    paddingBottom: 28,
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
    shadowColor: '#1f89ee',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 10,
  },
  iconRing: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  streakNumber: {
    fontSize: 56,
    fontWeight: '900',
    color: '#FFFFFF',
    lineHeight: 60,
  },
  streakLabel: {
    fontSize: 15,
    fontWeight: '900',
    color: 'rgba(255,255,255,0.85)',
    letterSpacing: 1.5,
    marginTop: 2,
    marginBottom: 24,
  },
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 10,
    marginBottom: 20,
  },
  dayCol: {
    alignItems: 'center',
    gap: 8,
  },
  dayLetter: {
    fontSize: 11,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.6)',
  },
  dayDot: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayDotDone: {
    backgroundColor: '#FFFFFF',
  },
  dayDotFrozen: {
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  dayDotToday: {
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  message: {
    fontSize: 14,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 20,
  },
  freezeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 16,
  },
  freezeText: {
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.85)',
  },
  button: {
    borderRadius: 16,
    paddingVertical: 16,
    width: '100%',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#1f89ee',
    letterSpacing: 0.8,
  },
});
