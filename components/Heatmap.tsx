import { format, subDays } from 'date-fns';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Rect } from 'react-native-svg';

const Heatmap = ({ stats }) => {
  if (!stats || !stats.scores_history) return null;

  // Convert history into { "2025-02-18": count }
  const map = {};
  stats.scores_history.forEach((entry) => {
    const day = entry.date.split('T')[0];
    map[day] = (map[day] ?? 0) + 1;
  });

  // Last 30 days
  const today = new Date();
  const days = Array.from({ length: 30 }).map((_, idx) => {
    const date = subDays(today, 29 - idx);
    const dateStr = format(date, 'yyyy-MM-dd');

    return {
      date: dateStr,
      value: map[dateStr] ?? 0,
    };
  });

  // ----- Month Labels -----
  const monthLabels = [];
  days.forEach((d, i) => {
    const dateObj = new Date(d.date);
    const prev = days[i - 1];
    const prevMonth = prev ? new Date(prev.date).getMonth() : null;

    // If month changed OR first item → add label
    if (i === 0 || dateObj.getMonth() !== prevMonth) {
      monthLabels.push({
        label: format(dateObj, 'MMM'), // Jan, Feb, Mar...
        x: (i % 15) * 22,
      });
    }
  });

  // Color scale
  const getColor = (value) => {
    if (value === 0) return '#e5e7eb';
    if (value === 1) return '#bae6fd';
    if (value === 2) return '#7dd3fc';
    if (value === 3) return '#38bdf8';
    return '#0ea5e9';
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Training Activity</Text>

      <View style={styles.card}>
        <View style={styles.monthRow}>
          {monthLabels.map((m) => (
            <Text key={m.x} style={[styles.monthLabel, { left: m.x }]}>
              {m.label}
            </Text>
          ))}
        </View>
        <Svg width={330} height={80}>
          {days.map((d, i) => (
            <Rect
              key={d.date}
              x={(i % 15) * 22}
              y={Math.floor(i / 15) * 22}
              width={18}
              height={18}
              fill={getColor(d.value)}
              rx={4}
            />
          ))}
        </Svg>

        <View style={styles.legend}>
          <Text style={styles.legendLabel}>Less</Text>
          <View style={styles.legendRow}>
            <View style={[styles.legendBox, { backgroundColor: '#e5e7eb' }]} />
            <View style={[styles.legendBox, { backgroundColor: '#bae6fd' }]} />
            <View style={[styles.legendBox, { backgroundColor: '#7dd3fc' }]} />
            <View style={[styles.legendBox, { backgroundColor: '#38bdf8' }]} />
            <View style={[styles.legendBox, { backgroundColor: '#0ea5e9' }]} />
          </View>
          <Text style={styles.legendLabel}>More</Text>
        </View>
      </View>
    </View>
  );
};

export default Heatmap;

const styles = StyleSheet.create({
  container: {
    marginTop: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
  },
  card: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  legendRow: {
    flexDirection: 'row',
    marginHorizontal: 12,
  },
  legendBox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    marginHorizontal: 2,
  },
  legendLabel: {
    fontSize: 12,
    color: '#6b7280',
  },
  monthRow: {
    position: 'relative',
    height: 20,
    marginBottom: 6,
  },
  monthLabel: {
    position: 'absolute',
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
  },
});
