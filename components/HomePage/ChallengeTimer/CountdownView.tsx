import { CountdownValue } from '@/hooks/useChallengeTimer';
import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

// Shared by SprintTimerModal (race mode) and DurationChallengeModal (duration
// mode) — both count down 5..1,GO before starting their respective timers.
const CountdownView: React.FC<{ value: CountdownValue }> = ({ value }) => {
  const scale = useSharedValue(0.6);

  useEffect(() => {
    scale.value = 0.6;
    scale.value = withSequence(withTiming(1.15, { duration: 150 }), withTiming(1, { duration: 150 }));
  }, [value, scale]);

  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <View style={styles.centerFill}>
      <Animated.Text style={[styles.countdownText, animatedStyle, value === 'GO' && styles.goText]}>
        {value}
      </Animated.Text>
    </View>
  );
};

export default CountdownView;

const styles = StyleSheet.create({
  centerFill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countdownText: {
    fontSize: 120,
    fontWeight: '900',
    color: '#1f89ee',
  },
  goText: {
    color: '#31af4d',
  },
});
