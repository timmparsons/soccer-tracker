import ConfettiCannon from 'react-native-confetti-cannon';
import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import type { WeeklyChallenge } from '@/lib/teamBadges';

const { width } = Dimensions.get('window');

interface TeamBadgeEarnedModalProps {
  visible: boolean;
  onClose: () => void;
  badges: WeeklyChallenge[];
}

export default function TeamBadgeEarnedModal({
  visible,
  onClose,
  badges,
}: TeamBadgeEarnedModalProps) {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const confettiRef = useRef<ConfettiCannon>(null);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (visible) {
      setIndex(0);
      scaleAnim.setValue(0);
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 80,
        friction: 7,
      }).start();
      setTimeout(() => confettiRef.current?.start(), 300);
    } else {
      scaleAnim.setValue(0);
    }
  }, [visible]);

  if (!badges.length) return null;

  const badge = badges[index];
  const hasMore = index < badges.length - 1;

  const handleNext = () => {
    scaleAnim.setValue(0);
    setIndex((i) => i + 1);
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 80,
      friction: 7,
    }).start();
  };

  return (
    <Modal
      visible={visible}
      animationType='fade'
      transparent
      hardwareAccelerated
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <ConfettiCannon
          ref={confettiRef}
          count={120}
          origin={{ x: width / 2, y: -20 }}
          autoStart={false}
          fadeOut
          explosionSpeed={350}
          fallSpeed={3000}
          colors={[badge.color, '#ffb724', '#31af4d', '#1f89ee', '#FFFFFF']}
        />

        <Animated.View style={[styles.card, { transform: [{ scale: scaleAnim }] }]}>
          {badges.length > 1 && (
            <View style={styles.countPill}>
              <Text style={styles.countText}>{index + 1} of {badges.length}</Text>
            </View>
          )}

          <View style={styles.teamLabel}>
            <Text style={styles.teamLabelText}>TEAM ACHIEVEMENT</Text>
          </View>

          <View style={[styles.iconRing, { borderColor: badge.color, backgroundColor: badge.color + '22' }]}>
            <Text style={styles.badgeEmoji}>{badge.icon}</Text>
          </View>

          <Text style={styles.earned}>Your whole team earned this!</Text>
          <Text style={[styles.badgeName, { color: badge.color }]}>{badge.name}</Text>
          <Text style={styles.description}>{badge.description}</Text>

          <TouchableOpacity
            style={[styles.button, { backgroundColor: badge.color }]}
            onPress={hasMore ? handleNext : onClose}
            activeOpacity={0.85}
          >
            <Text style={styles.buttonText}>
              {hasMore ? 'NEXT BADGE →' : 'LET\'S GO! 🔥'}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 28,
    paddingHorizontal: 28,
    paddingTop: 32,
    paddingBottom: 28,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
    gap: 12,
  },
  countPill: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  countText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B7280',
  },
  teamLabel: {
    backgroundColor: '#1a1a2e',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginBottom: 4,
  },
  teamLabelText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#FFF',
    letterSpacing: 1.5,
  },
  iconRing: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  badgeEmoji: {
    fontSize: 52,
  },
  earned: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 1,
    textAlign: 'center',
  },
  badgeName: {
    fontSize: 28,
    fontWeight: '900',
    textAlign: 'center',
  },
  description: {
    fontSize: 15,
    fontWeight: '500',
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 22,
  },
  button: {
    borderRadius: 16,
    paddingVertical: 16,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
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
