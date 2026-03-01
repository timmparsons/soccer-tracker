import { getVinnieMood } from '@/lib/vinnie';
import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, Image, StyleSheet, Text, View } from 'react-native';

interface VinnieCardProps {
  trainedToday: boolean;
  streak: number;
}

// Hand display size — tune these if the hand looks too big/small
const HAND_W = 32;
const HAND_H = 40;

// Position of the hand over the body — tune to align with the ghost arm
// top/left are relative to the vinnieContainer
const HAND_TOP = -5;
const HAND_LEFT = 80;

// Rotation pivot = bottom-center of the hand image (the wrist)
// Since the hand fills its frame, this is simply half the height
const PIVOT_Y = HAND_H / 2;

// Starting angle offset — positive = clockwise, moves hand away from face
const HAND_ANGLE_OFFSET = 20;

const VinnieCard = ({ trainedToday, streak }: VinnieCardProps) => {
  const now = new Date();
  const hour = now.getHours();
  const dayOfWeek = now.getDay();

  const waveAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const wave = Animated.loop(
      Animated.sequence([
        // First wave
        Animated.timing(waveAnim, {
          toValue: 1,
          duration: 280,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(waveAnim, {
          toValue: 0,
          duration: 280,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        // Second wave
        Animated.timing(waveAnim, {
          toValue: 1,
          duration: 280,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(waveAnim, {
          toValue: 0,
          duration: 280,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        // Pause before next wave
        Animated.delay(3000),
      ]),
    );
    wave.start();
    return () => wave.stop();
  }, [waveAnim]);

  const rotate = waveAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [
      `${HAND_ANGLE_OFFSET - 10}deg`,
      `${HAND_ANGLE_OFFSET + 20}deg`,
    ],
  });

  const { message } = useMemo(
    () => getVinnieMood({ trainedToday, streak, hour, dayOfWeek }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [trainedToday, streak],
  );

  return (
    <View style={styles.row}>
      <View style={styles.vinnieContainer}>
        <Image
          source={require('@/assets/images/vinnie_body.png')}
          style={styles.vinnieImage}
          resizeMode='contain'
        />
        {/* Hand positioned over the ghost arm, rotates around the wrist */}
        <Animated.Image
          source={require('@/assets/images/vinnie_hand.png')}
          style={[
            styles.hand,
            {
              transform: [
                { translateY: PIVOT_Y },
                { rotate },
                { translateY: -PIVOT_Y },
              ],
            },
          ]}
          resizeMode='contain'
        />
      </View>

      <View style={styles.bubbleRow}>
        <View style={styles.tail} />
        <View style={styles.bubble}>
          <Text style={styles.message}>{message} — Coach Vinnie</Text>
        </View>
      </View>
    </View>
  );
};

export default VinnieCard;

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  vinnieContainer: {
    width: 120,
    height: 78,
    flexShrink: 0,
    overflow: 'visible',
  },
  vinnieImage: {
    width: 120,
    height: 78,
  },
  hand: {
    position: 'absolute',
    top: HAND_TOP,
    left: HAND_LEFT,
    width: HAND_W,
    height: HAND_H,
  },
  bubbleRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  tail: {
    width: 0,
    height: 0,
    borderTopWidth: 8,
    borderBottomWidth: 8,
    borderRightWidth: 12,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderRightColor: '#E8E8E8',
  },
  bubble: {
    flex: 1,
    backgroundColor: '#E8E8E8',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  message: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1a1a2e',
    lineHeight: 21,
  },
});
