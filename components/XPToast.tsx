import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text } from 'react-native';

type Props = {
  visible: boolean;
  xp: number;
};

export default function XPToast({ visible, xp }: Props) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setTimeout(() => {
          Animated.parallel([
            Animated.timing(opacity, {
              toValue: 0,
              duration: 250,
              useNativeDriver: true,
            }),
            Animated.timing(translateY, {
              toValue: 20,
              duration: 250,
              useNativeDriver: true,
            }),
          ]).start();
        }, 1200);
      });
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <Animated.View
      style={[styles.toast, { opacity, transform: [{ translateY }] }]}
    >
      <Text style={styles.xp}>{`+${xp} XP`}</Text>
      <Text style={styles.message}>Great work!</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    top: 300,
    alignSelf: 'center',
    backgroundColor: '#1d4ed8', // EA Sports blue
    paddingVertical: 40,
    paddingHorizontal: 60,
    borderRadius: 20,
    shadowColor: '#3b82f6',
    shadowOpacity: 0.55,
    shadowRadius: 20,
    elevation: 6,
    alignItems: 'center',
  },
  xp: {
    fontSize: 44,
    fontWeight: '900',
    color: '#ffffff',
    textShadowColor: 'rgba(255,255,255,0.8)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 12,
  },
  message: {
    marginTop: 8,
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
  },
});
