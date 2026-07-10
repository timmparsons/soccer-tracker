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
}

const CircularProgress = ({
  progress,
  size = 130,
  thickness = 10,
  color = '#1f89ee',
  trackColor = '#EFF6FF',
  labelColor = '#78909C',
}: Props) => {
  const pct = Math.round(Math.min(progress, 1) * 100);
  const pctFontSize = Math.round(size * 0.22);
  const subFontSize = Math.round(size * 0.09);

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
});
