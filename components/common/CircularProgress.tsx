import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import * as Progress from 'react-native-progress';

interface Props {
  progress: number;
  size?: number;
  color?: string;
  trackColor?: string;
  labelColor?: string;
}

const CircularProgress = ({
  progress,
  size = 130,
  color = '#1f89ee',
  trackColor = '#EFF6FF',
  labelColor = '#78909C',
}: Props) => {
  const pct = Math.round(Math.min(progress, 1) * 100);

  return (
    <View style={styles.wrapper}>
      <Progress.Circle
        progress={Math.min(progress, 1)}
        size={size}
        color={color}
        unfilledColor={trackColor}
        borderWidth={0}
        thickness={10}
        animated
      />
      <View style={[styles.centerLabel, { width: size, height: size }]}>
        <Text style={[styles.pct, { color }]}>{pct}%</Text>
        <Text style={[styles.sub, { color: labelColor }]}>of goal</Text>
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
    fontSize: 28,
    fontWeight: '900',
  },
  sub: {
    fontSize: 11,
    fontWeight: '700',
    color: '#78909C',
    marginTop: 2,
  },
});
