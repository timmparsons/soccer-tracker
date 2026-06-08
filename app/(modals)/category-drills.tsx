import DrillVideoModal from '@/components/modals/DrillVideoModal';
import { FOCUS_LABELS, getFocusByKey, FocusKey } from '@/lib/trainingFocus';
import { useFocusDrills } from '@/hooks/useTouchTracking';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const DIFFICULTY_CONFIG: Record<string, { bg: string; text: string; label: string; icon: string }> = {
  beginner:     { bg: '#E8F5E9', text: '#388E3C', label: 'Beginner',     icon: '●' },
  intermediate: { bg: '#FFF3E0', text: '#F57C00', label: 'Intermediate', icon: '●●' },
  advanced:     { bg: '#FFEBEE', text: '#D32F2F', label: 'Advanced',     icon: '●●●' },
};

const DIFFICULTY_ORDER = ['beginner', 'intermediate', 'advanced'];

export default function CategoryDrillsScreen() {
  const { focus } = useLocalSearchParams<{ focus: string }>();
  const router = useRouter();
  const focusKey = (focus ?? 'free_play') as FocusKey;
  const category = getFocusByKey(focusKey);

  const { data: drills = [], isLoading } = useFocusDrills(focusKey);

  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoName, setVideoName] = useState('');

  const byDifficulty = DIFFICULTY_ORDER.reduce<Record<string, typeof drills>>(
    (acc, level) => {
      acc[level] = drills.filter((d) => d.difficulty_level === level);
      return acc;
    },
    {},
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton} activeOpacity={0.7}>
          <Ionicons name='arrow-back' size={24} color='#1a1a2e' />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.headerCategory}>{FOCUS_LABELS[focusKey]}</Text>
          <Text style={styles.headerDescription} numberOfLines={2}>{category.description}</Text>
        </View>
      </View>

      {isLoading ? (
        <View style={styles.loading}>
          <ActivityIndicator size='large' color='#1f89ee' />
        </View>
      ) : drills.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>No drills yet</Text>
          <Text style={styles.emptyText}>Drills for this category are coming soon.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {DIFFICULTY_ORDER.map((level) => {
            const levelDrills = byDifficulty[level];
            if (!levelDrills || levelDrills.length === 0) return null;
            const cfg = DIFFICULTY_CONFIG[level];
            return (
              <View key={level} style={styles.section}>
                {/* Section header */}
                <View style={[styles.sectionHeader, { backgroundColor: cfg.bg }]}>
                  <Text style={[styles.sectionDots, { color: cfg.text }]}>{cfg.icon}</Text>
                  <Text style={[styles.sectionLabel, { color: cfg.text }]}>{cfg.label}</Text>
                </View>

                {/* Drill rows */}
                {levelDrills.map((drill) => (
                  <TouchableOpacity
                    key={drill.id}
                    style={styles.drillRow}
                    onPress={() => {
                      if (drill.video_url) {
                        setVideoUrl(drill.video_url);
                        setVideoName(drill.name);
                      }
                    }}
                    activeOpacity={drill.video_url ? 0.7 : 1}
                  >
                    <View style={styles.drillLeft}>
                      <Text style={styles.drillName}>{drill.name}</Text>
                      <View style={[styles.difficultyBadge, { backgroundColor: cfg.bg }]}>
                        <Text style={[styles.difficultyBadgeText, { color: cfg.text }]}>{cfg.label}</Text>
                      </View>
                    </View>
                    {drill.video_url ? (
                      <View style={styles.watchButton}>
                        <Ionicons name='play-circle' size={20} color='#1f89ee' />
                        <Text style={styles.watchText}>Watch</Text>
                      </View>
                    ) : (
                      <Text style={styles.noVideoText}>No video yet</Text>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            );
          })}
        </ScrollView>
      )}

      {videoUrl && (
        <DrillVideoModal
          visible={!!videoUrl}
          onClose={() => setVideoUrl(null)}
          videoUrl={videoUrl}
          drillName={videoName}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F4F8',
  },
  backButton: {
    padding: 4,
  },
  headerText: {
    flex: 1,
  },
  headerCategory: {
    fontSize: 22,
    fontWeight: '900',
    color: '#1a1a2e',
    marginBottom: 2,
  },
  headerDescription: {
    fontSize: 13,
    fontWeight: '600',
    color: '#78909C',
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1a1a2e',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#78909C',
    textAlign: 'center',
  },
  scrollContent: {
    padding: 20,
    gap: 20,
  },
  section: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#F0F4F8',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  sectionDots: {
    fontSize: 10,
    letterSpacing: 2,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  drillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F0F4F8',
  },
  drillLeft: {
    flex: 1,
    gap: 6,
  },
  drillName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1a1a2e',
  },
  difficultyBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  difficultyBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  watchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  watchText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1f89ee',
  },
  noVideoText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#B0BEC5',
  },
});
