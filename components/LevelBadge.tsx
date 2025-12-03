import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

type Props = {
  level: number;
  xpIntoLevel: number;
  xpForNextLevel: number;
  rankName: string;
};

export default function LevelBadge({
  level,
  xpIntoLevel,
  xpForNextLevel,
  rankName,
}: Props) {
  const radius = 40;
  const strokeWidth = 8;
  const normalizedRadius = radius - strokeWidth / 2;
  const circumference = normalizedRadius * 2 * Math.PI;

  const progress = xpIntoLevel / xpForNextLevel;
  const strokeDashoffset = circumference - circumference * progress;

  return (
    <View style={styles.container}>
      <Svg height='100' width='100'>
        {/* Background circle */}
        <Circle
          stroke='#d1d5db'
          fill='none'
          cx='50'
          cy='50'
          r={normalizedRadius}
          strokeWidth={strokeWidth}
        />

        {/* Progress circle */}
        <Circle
          stroke='#3b82f6' // blue
          fill='none'
          cx='50'
          cy='50'
          r={normalizedRadius}
          strokeWidth={strokeWidth}
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap='round'
        />
      </Svg>

      {/* Level text in the center */}
      <View style={styles.levelWrapper}>
        <Text style={styles.levelText}>{level}</Text>
      </View>

      {/* Rank name */}
      <Text style={styles.rankText}>{rankName}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginVertical: 16,
  },
  levelWrapper: {
    position: 'absolute',
    top: 35, // center alignment adjustments
    justifyContent: 'center',
    alignItems: 'center',
    width: 40,
  },
  levelText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1f2937',
    textAlign: 'center',
  },
  rankText: {
    marginTop: 6,
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
});
