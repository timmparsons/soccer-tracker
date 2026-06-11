import { getVinnieGameSpeedTip } from '@/lib/vinnie';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Image,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

interface VinnieGameSpeedModalProps {
  visible: boolean;
  onClose: () => void;
}

const VinnieGameSpeedModal = ({ visible, onClose }: VinnieGameSpeedModalProps) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const [tip, setTip] = useState(getVinnieGameSpeedTip());

  useEffect(() => {
    if (visible) {
      setTip(getVinnieGameSpeedTip());
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
          <Image
            source={require('@/assets/images/vinnie.png')}
            style={styles.vinnieImage}
            resizeMode='contain'
          />

          <View style={styles.badge}>
            <Text style={styles.badgeText}>⚡ GAME SPEED</Text>
          </View>

          <View style={styles.tail} />
          <View style={styles.cloud}>
            <Text style={styles.message}>{tip}</Text>
          </View>

          <TouchableOpacity style={styles.button} onPress={onClose} activeOpacity={0.85}>
            <Text style={styles.buttonText}>LET&apos;S GO</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
};

export default VinnieGameSpeedModal;

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
  vinnieImage: {
    width: 180,
    height: 100,
  },
  badge: {
    backgroundColor: '#ffb724',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginTop: 8,
    marginBottom: 12,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#FFF',
    letterSpacing: 1,
  },
  tail: {
    width: 0,
    height: 0,
    borderLeftWidth: 10,
    borderRightWidth: 10,
    borderBottomWidth: 14,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#E8E8E8',
  },
  cloud: {
    backgroundColor: '#E8E8E8',
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 20,
    width: '100%',
    alignItems: 'center',
    marginBottom: 16,
  },
  message: {
    fontSize: 16,
    fontWeight: '900',
    color: '#1a1a2e',
    textAlign: 'center',
    lineHeight: 23,
  },
  button: {
    backgroundColor: '#1f89ee',
    borderRadius: 16,
    paddingVertical: 16,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#1f89ee',
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
