import TradingCardView, { RARITY_COLORS } from '@/components/TradingCard';
import type { EarnedCard } from '@/lib/checkCards';
import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

interface CardRevealModalProps {
  visible: boolean;
  onClose: () => void;
  cards: EarnedCard[];
}

export default function CardRevealModal({ visible, onClose, cards }: CardRevealModalProps) {
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

  if (!cards.length) return null;

  const safeIndex = Math.min(index, cards.length - 1);
  const earned = cards[safeIndex];
  if (!earned?.card) return null;

  const hasMore = safeIndex < cards.length - 1;
  const color = RARITY_COLORS[earned.card.rarity];

  const handleNext = () => {
    scaleAnim.setValue(0);
    setIndex(safeIndex + 1);
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
          {/* Count pill */}
          {cards.length > 1 && (
            <View style={styles.countPill}>
              <Text style={styles.countText}>{safeIndex + 1} of {cards.length}</Text>
            </View>
          )}

          <Text style={styles.headline}>Card Earned!</Text>

          {/* Source pill */}
          <View style={[styles.sourcePill, { backgroundColor: earned.source === 'milestone' ? '#ffb724' : '#1f89ee' }]}>
            <Text style={styles.sourceText}>
              {earned.source === 'milestone' ? '🏆 MILESTONE' : '🎲 SESSION DROP'}
            </Text>
          </View>

          {/* The card itself */}
          <TradingCardView card={earned.card} size='md' owned />

          <Text style={[styles.playerLabel, { color }]}>{earned.card.player_name}</Text>
          <Text style={styles.meta}>
            {earned.card.flag_emoji} {earned.card.nationality} · {earned.card.position}
          </Text>

          <TouchableOpacity
            style={[styles.button, { backgroundColor: color }]}
            onPress={hasMore ? handleNext : onClose}
            activeOpacity={0.85}
          >
            <Text style={styles.buttonText}>
              {hasMore ? 'NEXT CARD →' : 'NICE!'}
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
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: '#1a1a2e',
    borderRadius: 28,
    paddingHorizontal: 28,
    paddingTop: 32,
    paddingBottom: 28,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
    gap: 10,
  },
  countPill: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: '#2d2d4e',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  countText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#9CA3AF',
  },
  headline: {
    fontSize: 13,
    fontWeight: '700',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  sourcePill: {
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 5,
  },
  sourceText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 0.5,
  },
  playerLabel: {
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'center',
  },
  meta: {
    fontSize: 14,
    fontWeight: '600',
    color: '#78909C',
    marginBottom: 4,
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
    marginTop: 4,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FFF',
    letterSpacing: 0.8,
  },
});
