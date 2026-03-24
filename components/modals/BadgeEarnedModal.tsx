import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import type { Badge } from '@/hooks/useBadges';

interface BadgeEarnedModalProps {
  visible: boolean;
  onClose: () => void;
  badges: Badge[];
}

export default function BadgeEarnedModal({ visible, onClose, badges }: BadgeEarnedModalProps) {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (visible) {
      setIndex(0);
      scaleAnim.setValue(0);
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }).start();
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
      tension: 100,
      friction: 8,
    }).start();
  };

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
          {/* Badge count pill */}
          {badges.length > 1 && (
            <View style={styles.countPill}>
              <Text style={styles.countText}>{index + 1} of {badges.length}</Text>
            </View>
          )}

          {/* Badge icon */}
          <View style={[styles.iconRing, { borderColor: badge.color, backgroundColor: badge.color + '22' }]}>
            <Ionicons name={badge.icon as any} size={48} color={badge.color} />
          </View>

          <Text style={styles.earned}>Badge Earned!</Text>
          <Text style={[styles.badgeName, { color: badge.color }]}>{badge.name}</Text>
          <Text style={styles.description}>{badge.description}</Text>

          <TouchableOpacity
            style={[styles.button, { backgroundColor: badge.color }]}
            onPress={hasMore ? handleNext : onClose}
            activeOpacity={0.85}
          >
            <Text style={styles.buttonText}>
              {hasMore ? 'NEXT BADGE →' : 'AWESOME!'}
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
    backgroundColor: 'rgba(0,0,0,0.65)',
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
  iconRing: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  earned: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  badgeName: {
    fontSize: 26,
    fontWeight: '900',
    textAlign: 'center',
  },
  description: {
    fontSize: 15,
    fontWeight: '500',
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 8,
  },
  button: {
    borderRadius: 16,
    paddingVertical: 16,
    width: '100%',
    alignItems: 'center',
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
