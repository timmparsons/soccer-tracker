import { getVinnieCelebration } from '@/lib/vinnie';
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

interface VinnieCelebrationModalProps {
  visible: boolean;
  onClose: () => void;
  touchCount: number;
  streak?: number;
  isChallenge?: boolean;
  drillName?: string;
  overrideMessage?: string;
}

const VinnieCelebrationModal = ({
  visible,
  onClose,
  touchCount,
  streak,
  isChallenge,
  drillName,
  overrideMessage,
}: VinnieCelebrationModalProps) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const [message, setMessage] = useState(getVinnieCelebration());

  useEffect(() => {
    if (visible) {
      setMessage(overrideMessage ?? getVinnieCelebration());
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

  const sessionLabel =
    isChallenge && drillName
      ? `${drillName} challenge`
      : `${touchCount.toLocaleString()} touches logged`;

  return (
    <Modal
      visible={visible}
      animationType='fade'
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Animated.View
          style={[styles.card, { transform: [{ scale: scaleAnim }] }]}
        >
          {/* Vinnie — big and prominent */}
          <Image
            source={require('@/assets/images/vinnie.png')}
            style={styles.vinnieImage}
            resizeMode='contain'
          />

          {/* Speech bubble with upward tail pointing to Vinnie */}
          <View style={styles.tail} />
          <View style={styles.cloud}>
            <Text style={styles.message}>{message} — Coach Vinnie</Text>
          </View>

          {/* Session summary */}
          <View style={styles.summary}>
            <Text style={styles.summaryText}>{sessionLabel}</Text>
            {streak !== undefined && streak > 0 && (
              <View style={styles.streakRow}>
                <Text style={styles.streakFire}>🔥</Text>
                <Text style={styles.streakText}>{streak} day streak</Text>
              </View>
            )}
          </View>

          <TouchableOpacity
            style={styles.button}
            onPress={onClose}
            activeOpacity={0.85}
          >
            <Text style={styles.buttonText}>KEEP IT UP!</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
};

export default VinnieCelebrationModal;

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
    fontSize: 17,
    fontWeight: '900',
    color: '#1a1a2e',
    textAlign: 'center',
    lineHeight: 25,
  },
  summary: {
    backgroundColor: '#F5F7FA',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 20,
    width: '100%',
    alignItems: 'center',
    gap: 6,
    marginBottom: 16,
  },
  summaryText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1a1a2e',
  },
  streakRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  streakFire: {
    fontSize: 14,
  },
  streakText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FF9800',
  },
  button: {
    backgroundColor: '#10B981',
    borderRadius: 16,
    paddingVertical: 16,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#10B981',
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
