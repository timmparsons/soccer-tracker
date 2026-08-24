import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import * as Progress from 'react-native-progress';

interface Props {
  progress: number;
  size?: number;
  thickness?: number;
  color?: string;
  trackColor?: string;
  labelColor?: string;
  streak?: number;
  showStreak?: boolean;
}

const CircularProgress = ({
  progress,
  size = 130,
  thickness = 10,
  color = '#1f89ee',
  trackColor = '#EFF6FF',
  labelColor = '#78909C',
  streak = 0,
  showStreak = false,
}: Props) => {
  const pct = Math.round(Math.min(progress, 1) * 100);
  const pctFontSize = Math.round(size * 0.22);
  const subFontSize = Math.round(size * 0.09);
  const streakFontSize = Math.round(size * 0.11);

  return (
    <View style={styles.wrapper}>
      <Progress.Circle
        progress={Math.min(progress, 1)}
        size={size}
        color={color}
        unfilledColor={trackColor}
        borderWidth={0}
        thickness={thickness}
        animated
      />
      <View style={[styles.centerLabel, { width: size, height: size }]}>
        <Text style={[styles.pct, { color, fontSize: pctFontSize }]}>{pct}%</Text>
        <Text style={[styles.sub, { color: labelColor, fontSize: subFontSize }]}>of goal</Text>
        {showStreak && (
          <View style={styles.streakRow}>
            <Ionicons name='flame' size={streakFontSize} color='#ffb724' />
            <Text style={[styles.streakText, { fontSize: streakFontSize }]}>{streak}</Text>
          </View>
        )}
      </View>
    </View>
  );
};

export default CircularProgress;

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerLabel: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pct: {
    fontWeight: '900',
  },
  sub: {
    fontWeight: '700',
    color: '#78909C',
    marginTop: 2,
  },
  streakRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  streakText: {
    fontWeight: '800',
    color: '#ffb724',
  },
});
