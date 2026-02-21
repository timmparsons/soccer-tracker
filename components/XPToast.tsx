// components/XPToast.tsx
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface XPToastProps {
  visible: boolean;
  xp: number;
  juggles?: number;
}

export default function XPToast({ visible, xp, juggles }: XPToastProps) {
  if (!visible) return null;

  return (
    <View style={styles.container}>
      <View style={styles.toast}>
        <Ionicons name='trophy' size={32} color='#FFD700' />
        <View style={styles.textContainer}>
          <Text style={styles.xpText}>+{xp} XP</Text>
          {juggles && juggles > 0 && (
            <Text style={styles.jugglesText}>{juggles} juggles</Text>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 100,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 1000,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2C3E50',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
    gap: 12,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  textContainer: {
    alignItems: 'flex-start',
  },
  xpText: {
    fontSize: 24,
    fontWeight: '900',
    color: '#FFD700',
    letterSpacing: 0.5,
  },
  jugglesText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#9CA3AF',
    marginTop: 2,
  },
});
