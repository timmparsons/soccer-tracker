import * as d3 from 'd3-shape';
import { format, parseISO, startOfDay, subDays } from 'date-fns';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

const LineChart = ({ stats }) => {
  console.log('Stats in LineChart:', stats);
  if (!stats) return null;

  const history = stats.scores_history ?? [];
  console.log('Scores history:', history);

  // Build last 7 days of data
  const data = [];
  const today = new Date();

  for (let i = 6; i >= 0; i--) {
    const date = subDays(today, i);
    const dateStr = format(date, 'yyyy-MM-dd');

    // Find matching score - normalize both dates to compare properly
    const entry = history.find((h) => {
      try {
        const historyDate = parseISO(h.date);
        const historyDateStr = format(startOfDay(historyDate), 'yyyy-MM-dd');
        return historyDateStr === dateStr;
      } catch (e) {
        console.error('Error parsing date:', h.date, e);
        return false;
      }
    });

    data.push({
      label: format(date, 'EEE'), // Mon/Tue
      value: entry ? entry.score : 0,
      hasData: !!entry,
    });
  }

  console.log('Chart data:', data);

  // Create line path using d3-shape
  const width = 320;
  const height = 150;
  const padding = 20;

  const xScale = (index: number) =>
    padding + (index / 6) * (width - padding * 2);
  const maxY = Math.max(...data.map((d) => d.value), 10); // avoid divide by zero
  const yScale = (val: number) =>
    height - padding - (val / maxY) * (height - padding * 2);

  const linePath = d3
    .line()
    .x((d, i) => xScale(i))
    .y((d: any) => yScale(d.value))
    .curve(d3.curveMonotoneX)(data);

  return (
    <View>
      <Text style={styles.sectionTitle}>Weekly Score Trend</Text>

      <View style={styles.chartCard}>
        <Svg width={width} height={height}>
          {/* Line */}
          <Path d={linePath} stroke='#3b82f6' strokeWidth={3} fill='none' />

          {/* Dots - only show where there's actual data */}
          {data.map((d, i) => (
            <Circle
              key={i}
              cx={xScale(i)}
              cy={yScale(d.value)}
              r={d.hasData ? 6 : 3}
              fill={d.hasData ? '#3b82f6' : '#e5e7eb'}
            />
          ))}
        </Svg>

        {/* Labels */}
        <View style={styles.labelsRow}>
          {data.map((d, i) => (
            <View key={i} style={styles.labelContainer}>
              <Text style={[styles.label, d.hasData && styles.labelActive]}>
                {d.label}
              </Text>
              {d.hasData && <Text style={styles.scoreLabel}>{d.value}</Text>}
            </View>
          ))}
        </View>
      </View>
    </View>
  );
};

export default LineChart;

const styles = StyleSheet.create({
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginTop: 24,
    marginBottom: 8,
  },
  chartCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 16,
    marginVertical: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    alignItems: 'center',
  },
  labelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: 320,
    marginTop: 12,
  },
  labelContainer: {
    alignItems: 'center',
  },
  label: {
    fontSize: 12,
    color: '#9ca3af',
  },
  labelActive: {
    color: '#3b82f6',
    fontWeight: '600',
  },
  scoreLabel: {
    fontSize: 10,
    color: '#6b7280',
    marginTop: 2,
  },
});
