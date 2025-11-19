import * as d3 from 'd3-shape';
import { format, subDays } from 'date-fns';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

const LineChart = ({ stats }) => {
  console.log('QQQ Stats in LineChart:', stats);
  if (!stats) return null;

  const history = stats.scores_history ?? [];

  // Build last 7 days of data
  const data = [];
  const today = new Date();

  for (let i = 6; i >= 0; i--) {
    const date = subDays(today, i);
    const dateStr = format(date, 'yyyy-MM-dd');

    const entry = history.find((h) => h.date.startsWith(dateStr));

    data.push({
      label: format(date, 'EEE'), // Mon/Tue
      value: entry ? entry.score : 0,
    });
  }

  // Create line path using d3-shape
  const width = 320;
  const height = 150;

  const xScale = (index: number) => (index / 6) * width;
  const maxY = Math.max(...data.map((d) => d.value), 10); // avoid divide by zero
  const yScale = (val: number) => height - (val / maxY) * height;

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
          <Path d={linePath} stroke='#3b82f6' strokeWidth={4} fill='none' />

          {/* Dots */}
          {data.map((d, i) => (
            <Circle
              key={i}
              cx={xScale(i)}
              cy={yScale(d.value)}
              r={4}
              fill='#3b82f6'
            />
          ))}
        </Svg>

        {/* Labels */}
        <View style={styles.labelsRow}>
          {data.map((d, i) => (
            <Text key={i} style={styles.label}>
              {d.label}
            </Text>
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
    padding: 12,
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
    marginTop: 6,
  },
  label: {
    fontSize: 12,
    color: '#6b7280',
  },
});
