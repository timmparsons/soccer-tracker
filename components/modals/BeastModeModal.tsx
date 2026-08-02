import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DAILY_TOUCH_CAP } from '@/lib/touchCap';

interface BeastModeModalProps {
  visible: boolean;
  onClose: () => void;
  alreadyAtCap: boolean;
}

const BeastModeModal = ({ visible, onClose, alreadyAtCap }: BeastModeModalProps) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }).start();
    } else {
      scaleAnim.setValue(0);
    }
  }, [visible, scaleAnim]);

  return (
    <Modal
      visible={visible}
      animationType='fade'
      transparent={true}
      hardwareAccelerated
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Animated.View style={[styles.card, { transform: [{ scale: scaleAnim }] }]}>
          <Ionicons name='flame' size={56} color='#B23B00' />
          <Text style={styles.title}>Beast Mode!</Text>
          <Text style={styles.message}>
            {alreadyAtCap
              ? `You've already hit today's max — rest up!`
              : `You hit today's ${DAILY_TOUCH_CAP.toLocaleString()} touch cap.`}
          </Text>
          <TouchableOpacity style={styles.button} onPress={onClose} activeOpacity={0.85}>
            <Text style={styles.buttonText}>LET&apos;S GO!</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
};

export default BeastModeModal;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 28,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: '#1a1a2e',
    marginTop: 12,
    marginBottom: 6,
  },
  message: {
    fontSize: 14,
    fontWeight: '700',
    color: '#78909C',
    textAlign: 'center',
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#B23B00',
    borderRadius: 16,
    paddingVertical: 16,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#B23B00',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FFF',
    letterSpacing: 0.8,
  },
});
