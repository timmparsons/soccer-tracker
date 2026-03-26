import type { TradingCard } from '@/lib/checkCards';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export const RARITY_COLORS: Record<TradingCard['rarity'], string> = {
  common: '#9CA3AF',
  rare: '#1f89ee',
  epic: '#8b5cf6',
  legendary: '#ffb724',
};

const RARITY_LABELS: Record<TradingCard['rarity'], string> = {
  common: 'COMMON',
  rare: 'RARE',
  epic: 'EPIC',
  legendary: 'LEGENDARY',
};

const POSITION_COLORS: Record<TradingCard['position'], string> = {
  FWD: '#ef4444',
  MID: '#3b82f6',
  DEF: '#22c55e',
  GK: '#f59e0b',
};

const SIZES = {
  sm:  { width: 90,  height: 126, fontSize: 7,  subSize: 6,  iconSize: 46, pillH: 14, pillFontSize: 5 },
  md:  { width: 160, height: 224, fontSize: 13, subSize: 10, iconSize: 82, pillH: 20, pillFontSize: 9 },
  lg:  { width: 240, height: 336, fontSize: 18, subSize: 14, iconSize: 120, pillH: 26, pillFontSize: 11 },
};

interface TradingCardProps {
  card: TradingCard;
  owned?: boolean;
  size?: 'sm' | 'md' | 'lg';
  onPress?: () => void;
}

export default function TradingCardView({
  card,
  owned = true,
  size = 'md',
  onPress,
}: TradingCardProps) {
  const dim = SIZES[size];
  const color = owned ? RARITY_COLORS[card.rarity] : '#444';
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (card.rarity === 'legendary' && owned) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(shimmer, { toValue: 1, duration: 1200, useNativeDriver: true }),
          Animated.timing(shimmer, { toValue: 0, duration: 1200, useNativeDriver: true }),
        ]),
      ).start();
    }
    return () => shimmer.stopAnimation();
  }, [card.rarity, owned]);

  const shimmerOpacity = shimmer.interpolate({ inputRange: [0, 1], outputRange: [0, 0.18] });

  const gradientColors: [string, string] = owned
    ? [color + '55', '#1a1a2e']
    : ['#2d2d2d', '#0f0f1a'];

  const content = (
    <View style={[styles.card, { width: dim.width, height: dim.height, borderColor: owned ? color + '88' : '#333' }]}>
      <LinearGradient
        colors={gradientColors}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      />

      {/* Legendary shimmer overlay */}
      {card.rarity === 'legendary' && owned && (
        <Animated.View
          pointerEvents='none'
          style={[
            StyleSheet.absoluteFill,
            styles.shimmer,
            { opacity: shimmerOpacity },
          ]}
        />
      )}

      {/* Rarity pill */}
      <View style={[styles.rarityPill, { backgroundColor: owned ? color : '#444', height: dim.pillH }]}>
        <Text style={[styles.rarityText, { fontSize: dim.pillFontSize }]}>
          {RARITY_LABELS[card.rarity]}
        </Text>
      </View>

      {/* Silhouette area */}
      <View style={styles.silhouetteArea}>
        <Text style={{ fontSize: dim.iconSize, lineHeight: dim.iconSize * 1.1, opacity: owned ? 0.85 : 0.25 }}>
          {card.position === 'GK' ? '🧤' : '⚽'}
        </Text>
        {/* Player initial circle */}
        <View style={[styles.initialCircle, { backgroundColor: color + (owned ? '33' : '22'), borderColor: color + (owned ? '88' : '44'), width: dim.iconSize * 0.9, height: dim.iconSize * 0.9, borderRadius: dim.iconSize * 0.45 }]}>
          <Text style={[styles.initialText, { fontSize: dim.iconSize * 0.38, color: owned ? color : '#555' }]}>
            {card.player_name.split(' ').map((w) => w[0]).slice(0, 2).join('')}
          </Text>
        </View>
      </View>

      {/* Info strip */}
      <View style={[styles.infoStrip, { paddingHorizontal: dim.width * 0.06, paddingVertical: dim.height * 0.025 }]}>
        <Text style={[styles.playerName, { fontSize: dim.fontSize, color: owned ? '#fff' : '#666' }]} numberOfLines={1}>
          {card.player_name}
        </Text>
        <View style={styles.metaRow}>
          <Text style={[styles.flag, { fontSize: dim.subSize + 2 }]}>{card.flag_emoji}</Text>
          <View style={[styles.positionBadge, { backgroundColor: owned ? POSITION_COLORS[card.position] : '#333' }]}>
            <Text style={[styles.positionText, { fontSize: dim.subSize }]}>{card.position}</Text>
          </View>
        </View>
      </View>

      {/* Unowned lock overlay */}
      {!owned && (
        <View style={styles.lockOverlay}>
          <Text style={styles.lockIcon}>🔒</Text>
        </View>
      )}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
        {content}
      </TouchableOpacity>
    );
  }
  return content;
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 10,
    borderWidth: 1.5,
    overflow: 'hidden',
    position: 'relative',
  },
  shimmer: {
    backgroundColor: '#fff',
    transform: [{ rotate: '35deg' }, { scaleX: 2 }],
  },
  rarityPill: {
    alignSelf: 'flex-start',
    marginTop: 6,
    marginLeft: 6,
    borderRadius: 4,
    paddingHorizontal: 5,
    justifyContent: 'center',
  },
  rarityText: {
    color: '#fff',
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  silhouetteArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  initialCircle: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    position: 'absolute',
  },
  initialText: {
    fontWeight: '900',
  },
  infoStrip: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    gap: 2,
  },
  playerName: {
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  flag: {
    lineHeight: 18,
  },
  positionBadge: {
    borderRadius: 3,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  positionText: {
    color: '#fff',
    fontWeight: '800',
  },
  lockOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  lockIcon: {
    fontSize: 16,
    opacity: 0.6,
  },
});
