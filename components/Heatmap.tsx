import { format, subDays } from 'date-fns';
import React from 'react';
import { Dimensions, StyleSheet, Text, View } from 'react-native';
import Svg, { Rect } from 'react-native-svg';

const Heatmap = ({ stats }) => {
  if (!stats || !stats.scores_history) return null;

  // Get screen width and calculate responsive sizing
  const screenWidth = Dimensions.get('window').width;
  const padding = 32; // Card padding
  const availableWidth = screenWidth - padding - 32; // Extra margin

  // Calculate cell size and gap based on available width
  const cols = 15; // cells per row
  const gap = 3;
  const cellSize = Math.min(
    22, // max size
    Math.floor((availableWidth - gap * (cols - 1)) / cols)
  );

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

  // ----- Month Labels with overlap prevention -----
  const monthLabels = [];
  let lastLabelX = -50; // Track last label position to prevent overlap

  days.forEach((d, i) => {
    const dateObj = new Date(d.date);
    const prev = days[i - 1];
    const prevMonth = prev ? new Date(prev.date).getMonth() : null;

    // If month changed OR first item → consider adding label
    if (i === 0 || dateObj.getMonth() !== prevMonth) {
      const x = (i % cols) * (cellSize + gap);

      // Only add if there's enough space (at least 40px from last label)
      if (x - lastLabelX >= 40 || i === 0) {
        monthLabels.push({
          label: format(dateObj, 'MMM'),
          x: x,
        });
        lastLabelX = x;
      }
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

  const gridWidth = cols * (cellSize + gap) - gap;
  const gridHeight = 2 * (cellSize + gap) - gap;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Training Activity</Text>
      <View style={styles.card}>
        <View style={styles.monthRow}>
          {monthLabels.map((m, idx) => (
            <Text key={idx} style={[styles.monthLabel, { left: m.x }]}>
              {m.label}
            </Text>
          ))}
        </View>

        <Svg width={gridWidth} height={gridHeight}>
          {days.map((d, i) => (
            <Rect
              key={d.date}
              x={(i % cols) * (cellSize + gap)}
              y={Math.floor(i / cols) * (cellSize + gap)}
              width={cellSize}
              height={cellSize}
              fill={getColor(d.value)}
              rx={4}
            />
          ))}
        </Svg>

        <View style={styles.legend}>
          <Text style={styles.legendLabel}>Less</Text>
          <View style={styles.legendRow}>
            {[0, 1, 2, 3, 4].map((v) => (
              <View
                key={v}
                style={[styles.legendBox, { backgroundColor: getColor(v) }]}
              />
            ))}
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
    marginBottom: 12,
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
    marginTop: 12,
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
