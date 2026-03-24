import { getRankBadge, getRankName } from '@/lib/xp';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useRef, useEffect } from 'react';
import {
  Animated,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const LEVEL_THRESHOLDS = [
  0, 300, 700, 1200, 1800, 2500, 3400, 4600, 6000, 7700,
  9700, 12200, 15200, 18700, 22700, 27700, 33700, 40700, 48700, 57700,
  68200, 79000, 90100, 101500, 113200, 125200, 137500, 150000, 162800, 175900,
  189300, 203000, 217000, 231300, 245900, 260800, 276000, 291500, 307300, 323300,
  339600, 356200, 373100, 390300, 407800, 425600, 443700, 462100, 480800, 500000,
];

const TIERS = [
  { min: 1, max: 5, name: 'Grassroots' },
  { min: 6, max: 10, name: 'Club Player' },
  { min: 11, max: 15, name: 'Academy Player' },
  { min: 16, max: 20, name: 'First Team Prospect' },
  { min: 21, max: 25, name: 'Playmaker' },
  { min: 26, max: 30, name: 'Elite' },
  { min: 31, max: 35, name: 'Master Touch' },
  { min: 36, max: 40, name: 'Professional' },
  { min: 41, max: 45, name: 'World Class' },
  { min: 46, max: 50, name: 'Legend' },
];

export default function RoadmapScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ level?: string }>();
  const level = params.level ? parseInt(params.level, 10) : 1;

  return (
    <SafeAreaView style={styles.safe}>
      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.title}>Player Roadmap</Text>
        <TouchableOpacity style={styles.closeButton} onPress={() => router.back()}>
          <Ionicons name='close' size={28} color='#111827' />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
        <Text style={styles.subtitle}>
          Track your journey to becoming a{' '}
          <Text style={styles.bold}>Master Touch Legend</Text> 🌟
        </Text>

        {TIERS.map((tier, idx) => {
          const badge = getRankBadge(tier.name);
          const unlocked = level >= tier.min;
          const current = level >= tier.min && level <= tier.max;

          return (
            <TierCard
              key={idx}
              tier={tier}
              badge={badge}
              unlocked={unlocked}
              current={current}
              currentLevel={level}
            />
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

function TierCard({
  tier,
  badge,
  unlocked,
  current,
  currentLevel,
}: {
  tier: { min: number; max: number; name: string };
  badge: { color: string; icon: string };
  unlocked: boolean;
  current: boolean;
  currentLevel: number;
}) {
  const glow = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (current) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(glow, { toValue: 1, duration: 800, useNativeDriver: false }),
          Animated.timing(glow, { toValue: 0, duration: 800, useNativeDriver: false }),
        ])
      ).start();
    }
  }, [current]);

  const glowColor = glow.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(0,0,0,0)', badge.color + '55'],
  });

  const levels = Array.from({ length: tier.max - tier.min + 1 }, (_, i) => tier.min + i);

  return (
    <Animated.View
      style={[styles.tierCard, { opacity: unlocked ? 1 : 0.45, borderColor: glowColor }]}
    >
      {/* Tier header */}
      <View style={styles.tierHeader}>
        <View style={[styles.badgeIcon, { backgroundColor: badge.color }]}>
          <Ionicons name={badge.icon as any} size={22} color='#fff' />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.tierName}>{tier.name}</Text>
          <Text style={styles.tierRange}>Levels {tier.min}–{tier.max}</Text>
          {current && <Text style={styles.youAreHere}>⬅ You Are Here</Text>}
        </View>
        {unlocked ? (
          <Text style={styles.unlocked}>Unlocked ✓</Text>
        ) : (
          <Text style={styles.locked}>Locked</Text>
        )}
      </View>

      {/* Level rows */}
      <View style={styles.levelRows}>
        {levels.map((lvl) => {
          const xpRequired = LEVEL_THRESHOLDS[lvl - 1];
          const isCurrentLevel = lvl === currentLevel;
          return (
            <View
              key={lvl}
              style={[
                styles.levelRow,
                isCurrentLevel && { backgroundColor: badge.color + '22' },
              ]}
            >
              <Text style={[styles.levelNum, isCurrentLevel && { color: badge.color, fontWeight: '900' }]}>
                Lv {lvl}
              </Text>
              <Text style={[styles.levelXp, isCurrentLevel && { color: badge.color }]}>
                {xpRequired.toLocaleString()} XP
              </Text>
              {isCurrentLevel && (
                <View style={[styles.currentDot, { backgroundColor: badge.color }]} />
              )}
            </View>
          );
        })}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  closeButton: {
    position: 'absolute',
    right: 16,
    padding: 6,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#111827',
  },
  subtitle: {
    fontSize: 15,
    color: '#4b5563',
    marginVertical: 12,
    textAlign: 'center',
    paddingHorizontal: 10,
  },
  bold: {
    fontWeight: '700',
    color: '#2563eb',
  },
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  tierCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    marginBottom: 14,
    borderWidth: 2,
    overflow: 'hidden',
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  tierHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  badgeIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tierName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
  },
  tierRange: {
    fontSize: 13,
    color: '#6b7280',
  },
  youAreHere: {
    marginTop: 3,
    fontSize: 12,
    color: '#3b82f6',
    fontWeight: '700',
  },
  unlocked: {
    fontSize: 13,
    color: '#22c55e',
    fontWeight: '700',
  },
  locked: {
    fontSize: 13,
    color: '#ef4444',
    fontWeight: '700',
  },
  levelRows: {
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  levelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  levelNum: {
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
    width: 50,
  },
  levelXp: {
    fontSize: 13,
    color: '#6b7280',
    flex: 1,
  },
  currentDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
