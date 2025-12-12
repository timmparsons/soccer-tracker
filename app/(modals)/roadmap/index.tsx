import { getRankBadge } from '@/lib/xp';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import {
  Animated,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const TIERS = [
  { min: 1, max: 3, name: 'Grassroots' },
  { min: 4, max: 6, name: 'Club Player' },
  { min: 7, max: 9, name: 'Academy Player' },
  { min: 10, max: 12, name: 'First Team Prospect' },
  { min: 13, max: 15, name: 'Playmaker' },
  { min: 16, max: 18, name: 'Master Touch' },
  { min: 19, max: 20, name: 'Legend' },
];

export default function RoadmapScreen({ level = 1 }) {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safe}>
      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.title}>Player Roadmap</Text>

        <TouchableOpacity
          style={styles.closeButton}
          onPress={() => router.back()}
        >
          <Ionicons name='close' size={28} color='#111827' />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        <Text style={styles.subtitle}>
          Track your journey to becoming a{' '}
          <Text style={styles.bold}>Master Touch Legend</Text> 🌟
        </Text>

        {TIERS.map((tier, idx) => {
          const unlocked = level >= tier.min;
          const badge = getRankBadge(tier.name);

          return (
            <TierCard
              key={idx}
              tier={tier}
              unlocked={unlocked}
              badge={badge}
              current={level >= tier.min && level <= tier.max}
            />
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

/* -------------------------------
   Tier Card Component (Animated)
--------------------------------- */
function TierCard({
  tier,
  unlocked,
  badge,
  current,
}: {
  tier: any;
  unlocked: boolean;
  badge: any;
  current: boolean;
}) {
  const glow = useRef(new Animated.Value(0)).current;

  // Animate glow for CURRENT tier
  useEffect(() => {
    if (current) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(glow, {
            toValue: 1,
            duration: 800,
            useNativeDriver: false,
          }),
          Animated.timing(glow, {
            toValue: 0,
            duration: 800,
            useNativeDriver: false,
          }),
        ])
      ).start();
    }
  }, [current]);

  const glowColor = glow.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(0,0,0,0)', badge.color + '55'],
  });

  return (
    <Animated.View
      style={[
        styles.tierCard,
        { opacity: unlocked ? 1 : 0.45, borderColor: glowColor },
      ]}
    >
      <View style={[styles.badge, { backgroundColor: badge.color }]}>
        <Ionicons name={badge.icon as any} size={26} color='#fff' />
      </View>

      <View style={{ flex: 1 }}>
        <Text style={styles.tierName}>{tier.name}</Text>
        <Text style={styles.tierRange}>
          Levels {tier.min}–{tier.max}
        </Text>
        {current && <Text style={styles.youAreHere}>⬅ You Are Here!</Text>}
      </View>

      {unlocked ? (
        <Text style={styles.unlocked}>Unlocked ✓</Text>
      ) : (
        <Text style={styles.locked}>Locked</Text>
      )}
    </Animated.View>
  );
}

/* -------------------------------
   STYLES
--------------------------------- */
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
    padding: 16,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    shadowOpacity: 0.05,
    shadowRadius: 4,
    borderWidth: 2,
  },

  badge: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },

  tierName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },

  tierRange: {
    fontSize: 14,
    color: '#6b7280',
  },

  youAreHere: {
    marginTop: 4,
    fontSize: 13,
    color: '#3b82f6',
    fontWeight: '700',
  },

  unlocked: {
    fontSize: 14,
    color: '#22c55e',
    fontWeight: '700',
  },

  locked: {
    fontSize: 14,
    color: '#ef4444',
    fontWeight: '700',
  },
});
