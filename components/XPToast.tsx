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
      // Fade in
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
        // Auto-fade out
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
    top: 100,
    alignSelf: 'center',
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
    alignItems: 'center',
  },
  xp: {
    fontSize: 20,
    fontWeight: '800',
    color: '#3b82f6',
  },
  message: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
});
