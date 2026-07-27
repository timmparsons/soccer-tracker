import { getLocalDate } from '@/utils/getLocalDate';
import React, { useEffect, useState } from 'react';
import { LayoutChangeEvent, StyleSheet, Text, View } from 'react-native';

export interface HeatmapCell {
  date: string;
  value: number;
}

interface ActivityHeatmapProps {
  // Consecutive real days (oldest first), ending today — a generous buffer.
  // The grid measures its own width and trims this down to however many
  // full weeks (columns) actually fit, so it always renders as a completely
  // filled rectangle with no wasted space.
  cells: HeatmapCell[];
  // Fires whenever the number of weeks actually rendered changes, so a
  // parent header (e.g. "Last N Weeks") can stay in sync.
  onWeeksVisibleChange?: (weeks: number) => void;
}

// GitHub only labels every other row to avoid clutter.
const DAY_ROW_LABELS = ['', 'Mon', '', 'Wed', '', 'Fri', ''];
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// GitHub-style 5-tier scale (empty + 4 intensity levels), in this app's blue.
const TIERS = ['#EEF2F7', '#CDE4FB', '#8EC3F5', '#4DA3EF', '#1f89ee'];

const CELL_SIZE = 13;
const CELL_GAP = 4;
const DAY_LABEL_WIDTH = 28;

const tierColor = (value: number, max: number): string => {
  if (value <= 0 || max <= 0) return TIERS[0];
  const pct = value / max;
  if (pct <= 0.25) return TIERS[1];
  if (pct <= 0.5) return TIERS[2];
  if (pct <= 0.75) return TIERS[3];
  return TIERS[4];
};

const ActivityHeatmap = ({ cells, onWeeksVisibleChange }: ActivityHeatmapProps) => {
  const today = getLocalDate();
  const [containerWidth, setContainerWidth] = useState(0);

  const maxWeeksAvailable = Math.floor(cells.length / 7);
  const weeksThatFit = Math.floor((containerWidth - DAY_LABEL_WIDTH) / (CELL_SIZE + CELL_GAP));
  const weeksToShow = Math.max(1, Math.min(maxWeeksAvailable, weeksThatFit || maxWeeksAvailable));

  const visibleCells = cells.slice(-weeksToShow * 7);
  const max = Math.max(0, ...visibleCells.map((c) => c.value));

  useEffect(() => {
    if (containerWidth > 0) {
      onWeeksVisibleChange?.(weeksToShow);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weeksToShow, containerWidth]);

  const handleLayout = (e: LayoutChangeEvent) => {
    setContainerWidth(e.nativeEvent.layout.width);
  };

  // Chunk into 7-day columns, then place each cell by its actual weekday
  // (not slice position) so row 0 is always Sunday no matter which weekday
  // the window happens to start on.
  const columns: HeatmapCell[][] = [];
  for (let i = 0; i < visibleCells.length; i += 7) {
    const week = visibleCells.slice(i, i + 7);
    const col: HeatmapCell[] = [];
    week.forEach((cell) => {
      col[new Date(cell.date + 'T00:00:00').getDay()] = cell;
    });
    columns.push(col);
  }

  // Month label per column — only shown the first time a new month appears,
  // same as GitHub's contribution graph.
  const columnMonths = columns.map((col) => {
    const anchor = col.find(Boolean);
    return anchor ? MONTH_NAMES[new Date(anchor.date + 'T00:00:00').getMonth()] : '';
  });

  return (
    <View style={styles.wrapper} onLayout={handleLayout}>
      <View style={styles.monthRow}>
        <View style={{ width: DAY_LABEL_WIDTH }} />
        {columnMonths.map((month, i) => (
          <View key={i} style={{ width: CELL_SIZE, marginRight: CELL_GAP }}>
            <Text style={styles.monthLabel} numberOfLines={1}>
              {i === 0 || month !== columnMonths[i - 1] ? month : ''}
            </Text>
          </View>
        ))}
      </View>

      <View style={styles.grid}>
        <View style={styles.dayLabels}>
          {DAY_ROW_LABELS.map((label, i) => (
            <Text key={i} style={styles.dayLabel}>
              {label}
            </Text>
          ))}
        </View>

        <View style={styles.columns}>
          {columns.map((column, colIndex) => (
            <View key={colIndex} style={styles.column}>
              {column.map((cell, rowIndex) => (
                <View
                  key={rowIndex}
                  style={[
                    styles.cell,
                    { backgroundColor: tierColor(cell.value, max) },
                    cell.date === today && styles.cellToday,
                  ]}
                />
              ))}
            </View>
          ))}
        </View>
      </View>

      <View style={styles.legendRow}>
        <Text style={styles.legendText}>Less</Text>
        {TIERS.map((color, i) => (
          <View key={i} style={[styles.legendCell, { backgroundColor: color }]} />
        ))}
        <Text style={styles.legendText}>More</Text>
      </View>
    </View>
  );
};

export default ActivityHeatmap;

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
  },
  monthRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  monthLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#78909C',
    width: 40,
  },
  grid: {
    flexDirection: 'row',
  },
  dayLabels: {
    width: DAY_LABEL_WIDTH,
  },
  dayLabel: {
    width: DAY_LABEL_WIDTH,
    height: CELL_SIZE,
    marginBottom: CELL_GAP,
    fontSize: 10,
    fontWeight: '700',
    color: '#78909C',
    lineHeight: CELL_SIZE,
  },
  columns: {
    flexDirection: 'row',
    gap: CELL_GAP,
  },
  column: {
    gap: CELL_GAP,
  },
  cell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    borderRadius: 3,
  },
  cellToday: {
    borderWidth: 1.5,
    borderColor: '#ffb724',
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
    marginTop: 10,
  },
  legendCell: {
    width: 10,
    height: 10,
    borderRadius: 2,
  },
  legendText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#78909C',
    marginHorizontal: 2,
  },
});
