import { getLocalDate } from '@/utils/getLocalDate';
import { StyleSheet, Text, View } from 'react-native';

interface PlayerStats {
  id: string;
  daily_target: number;
}

interface SelectedDaySummaryProps {
  players: PlayerStats[];
  sessionMap: Record<string, Record<string, { touches: number }>>;
  selectedDate: string;
}

export default function SelectedDaySummary({
  players,
  sessionMap,
  selectedDate,
}: SelectedDaySummaryProps) {
  const trainedPlayers = players.filter(
    (p) => (sessionMap[p.id]?.[selectedDate]?.touches ?? 0) > 0,
  );
  const hitTargetCount = trainedPlayers.filter(
    (p) => (sessionMap[p.id]?.[selectedDate]?.touches ?? 0) >= p.daily_target,
  ).length;
  const totalTouches = trainedPlayers.reduce(
    (s, p) => s + (sessionMap[p.id]?.[selectedDate]?.touches ?? 0),
    0,
  );
  const avgTouches =
    trainedPlayers.length > 0 ? Math.round(totalTouches / trainedPlayers.length) : 0;

  const isToday = selectedDate === getLocalDate();
  const dateObj = new Date(selectedDate + 'T00:00:00');
  const dateLabel = isToday
    ? 'Today'
    : dateObj.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

  return (
    <View style={styles.container}>
      <Text style={styles.dateLabel}>{dateLabel}</Text>
      <View style={styles.pills}>
        <View style={styles.pill}>
          <Text style={styles.pillText}>
            {trainedPlayers.length}/{players.length} trained
          </Text>
        </View>
        {avgTouches > 0 && (
          <View style={styles.pill}>
            <Text style={styles.pillText}>avg {avgTouches.toLocaleString()}</Text>
          </View>
        )}
        <View style={styles.pill}>
          <Text style={styles.pillText}>{hitTargetCount} hit target</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  dateLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#78909C',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  pills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  pill: {
    backgroundColor: '#EEF2FF',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  pillText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1f89ee',
  },
});
