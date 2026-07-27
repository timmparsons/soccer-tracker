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
  const todayObj = new Date(today + 'T00:00:00');
  const [containerWidth, setContainerWidth] = useState(0);

  // Sunday that starts the calendar week containing today.
  const currentWeekStart = new Date(todayObj);
  currentWeekStart.setDate(currentWeekStart.getDate() - currentWeekStart.getDay());

  const earliestDate = cells.length > 0 ? new Date(cells[0].date + 'T00:00:00') : todayObj;
  const maxWeeksAvailable = Math.max(
    1,
    Math.floor((currentWeekStart.getTime() - earliestDate.getTime()) / (7 * 86400000)) + 1,
  );
  const weeksThatFit = Math.floor((containerWidth - DAY_LABEL_WIDTH) / (CELL_SIZE + CELL_GAP));
  const weeksToShow = Math.max(1, Math.min(maxWeeksAvailable, weeksThatFit || maxWeeksAvailable));

  const cellMap = new Map(cells.map((c) => [c.date, c.value]));

  useEffect(() => {
    if (containerWidth > 0) {
      onWeeksVisibleChange?.(weeksToShow);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weeksToShow, containerWidth]);

  const handleLayout = (e: LayoutChangeEvent) => {
    setContainerWidth(e.nativeEvent.layout.width);
  };

  // Build columns from real Sunday–Saturday calendar weeks (not array
  // slicing), so the current week's column only ever holds today and
  // earlier — days after today stay null (rendered empty) instead of
  // accidentally picking up last week's data for that weekday slot.
  const columns: (HeatmapCell | null)[][] = [];
  for (let w = weeksToShow - 1; w >= 0; w--) {
    const weekStart = new Date(currentWeekStart);
    weekStart.setDate(weekStart.getDate() - w * 7);
    const col: (HeatmapCell | null)[] = [];
    for (let d = 0; d < 7; d++) {
      const cellDate = new Date(weekStart);
      cellDate.setDate(cellDate.getDate() + d);
      if (cellDate > todayObj) {
        col[d] = null;
      } else {
        const dateStr = getLocalDate(cellDate);
        col[d] = { date: dateStr, value: cellMap.get(dateStr) ?? 0 };
      }
    }
    columns.push(col);
  }

  const max = Math.max(
    0,
    ...columns.flat().filter((c): c is HeatmapCell => c !== null).map((c) => c.value),
  );

  // Month label per column — only shown the first time a new month appears,
  // same as GitHub's contribution graph.
  const columnMonths = columns.map((col) => {
    const anchor = col.find((c): c is HeatmapCell => c !== null);
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
                    {
                      backgroundColor: cell ? tierColor(cell.value, max) : 'transparent',
                    },
                    cell?.date === today && styles.cellToday,
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
