import { useSetWeeklyGoal, useWeeklyGoal } from '@/hooks/useWeeklyGoal';
import type { WeekDay } from '@/hooks/useTouchTracking';
import { DEFAULT_WEEKLY_GOAL_DAYS, getWeeklyGoalProgress, WeeklyGoalProgress } from '@/lib/weeklyGoal';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const DAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const GOAL_OPTIONS = [1, 2, 3, 4, 5, 6, 7];

interface WeeklyGoalCardProps {
  userId: string;
  weekActivity: WeekDay[];
}

const getMessage = ({ status, daysNeeded, daysLeft }: WeeklyGoalProgress): string => {
  switch (status) {
    case 'hit':
      return 'Goal hit! Anything extra is a bonus';
    case 'on-track':
      return `${daysNeeded} more day${daysNeeded === 1 ? '' : 's'} to hit your goal`;
    case 'at-risk':
      return daysLeft === 1 ? 'Last day left to hit it. Make it count' : `Need all ${daysLeft} days left`;
    case 'out-of-reach':
      return 'Out of reach this week, but every session still counts';
  }
};

const WeeklyGoalCard = ({ userId, weekActivity }: WeeklyGoalCardProps) => {
  const { data: goal = DEFAULT_WEEKLY_GOAL_DAYS } = useWeeklyGoal(userId);
  const setWeeklyGoal = useSetWeeklyGoal(userId);
  const [pickerVisible, setPickerVisible] = useState(false);

  if (weekActivity.length === 0) return null;

  const progress = getWeeklyGoalProgress(weekActivity, goal);
  const hit = progress.status === 'hit';
  const atRisk = progress.status === 'at-risk';

  return (
    <>
      <TouchableOpacity
        style={[styles.card, hit && styles.cardHit]}
        onPress={() => setPickerVisible(true)}
        activeOpacity={0.85}
      >
        <View style={styles.header}>
          <View style={styles.countRow}>
            <Text style={[styles.count, hit && styles.textOnHit]}>{progress.daysTrained}</Text>
            <Text style={[styles.countOf, hit && styles.textOnHitDim]}> / {goal} days</Text>
            <Text style={[styles.countWeek, hit && styles.textOnHitDim]}> this week</Text>
          </View>
          <View style={[styles.editButton, hit && styles.editButtonOnHit]}>
            <Ionicons name='pencil' size={13} color={hit ? '#FFFFFF' : '#78909C'} />
          </View>
        </View>

        <View style={styles.weekRow}>
          {weekActivity.map((day) => (
            <View key={day.date} style={styles.dayCol}>
              <View
                style={[
                  styles.dayDot,
                  day.status === 'done' && (hit ? styles.dayDotDoneOnHit : styles.dayDotDone),
                  day.status === 'frozen' && styles.dayDotFrozen,
                  day.isToday && day.status !== 'done' && styles.dayDotToday,
                ]}
              >
                {day.status === 'done' && (
                  <Ionicons name='checkmark' size={14} color={hit ? '#31af4d' : '#FFFFFF'} />
                )}
                {day.status === 'frozen' && <Ionicons name='snow' size={11} color='#FFFFFF' />}
              </View>
              <Text style={[styles.dayLetter, hit && styles.textOnHitDim]}>{DAY_LETTERS[day.dayOfWeek]}</Text>
            </View>
          ))}
        </View>

        <View style={[styles.divider, hit && styles.dividerOnHit]} />

        <Text style={[styles.message, atRisk && styles.messageRisk, hit && styles.textOnHit]}>
          {getMessage(progress)}
        </Text>
      </TouchableOpacity>

      <Modal visible={pickerVisible} transparent animationType='fade' onRequestClose={() => setPickerVisible(false)}>
        <Pressable style={styles.overlay} onPress={() => setPickerVisible(false)}>
          <Pressable style={styles.sheet}>
            <Text style={styles.sheetTitle}>Weekly Goal</Text>
            <Text style={styles.sheetSubtitle}>How many days a week do you want to train?</Text>
            <View style={styles.optionsRow}>
              {GOAL_OPTIONS.map((days) => (
                <TouchableOpacity
                  key={days}
                  style={[styles.option, goal === days && styles.optionActive]}
                  onPress={() => {
                    setWeeklyGoal.mutate(days);
                    setPickerVisible(false);
                  }}
                  disabled={setWeeklyGoal.isPending}
                >
                  <Text style={[styles.optionText, goal === days && styles.optionTextActive]}>{days}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.sheetHint}>Most players do best with 3 to 5. Rest days are part of training.</Text>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
};

export default WeeklyGoalCard;

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 10,
    shadowColor: '#0B1D3A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
    elevation: 5,
  },
  cardHit: {
    backgroundColor: '#31af4d',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  editButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#F1F4F8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  editButtonOnHit: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  countRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  count: {
    fontSize: 26,
    fontWeight: '900',
    color: '#1f89ee',
  },
  countOf: {
    fontSize: 16,
    fontWeight: '900',
    color: '#1a1a2e',
    marginLeft: 2,
  },
  countWeek: {
    fontSize: 14,
    fontWeight: '600',
    color: '#78909C',
  },
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dayCol: {
    alignItems: 'center',
    gap: 2,
  },
  dayDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E6ECF3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayDotDone: {
    backgroundColor: '#1f89ee',
  },
  dayDotDoneOnHit: {
    backgroundColor: '#FFFFFF',
  },
  dayDotFrozen: {
    backgroundColor: '#7CC4FA',
  },
  dayDotToday: {
    borderWidth: 2,
    borderColor: '#1f89ee',
  },
  dayLetter: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1a1a2e',
  },
  divider: {
    height: 1,
    backgroundColor: '#E6ECF3',
  },
  dividerOnHit: {
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  message: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a2e',
  },
  messageRisk: {
    color: '#E5484D',
    fontWeight: '700',
  },
  textOnHit: {
    color: '#FFFFFF',
  },
  textOnHitDim: {
    color: 'rgba(255,255,255,0.8)',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 24,
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    gap: 12,
  },
  sheetTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#1a1a2e',
    textAlign: 'center',
  },
  sheetSubtitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#78909C',
    textAlign: 'center',
  },
  optionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  option: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#F1F4F8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionActive: {
    backgroundColor: '#1f89ee',
  },
  optionText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#1a1a2e',
  },
  optionTextActive: {
    color: '#FFFFFF',
  },
  sheetHint: {
    fontSize: 13,
    fontWeight: '600',
    color: '#78909C',
    textAlign: 'center',
    marginTop: 4,
  },
});
