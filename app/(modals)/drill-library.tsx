import PageHeader from '@/components/common/PageHeader';
import BadgeEarnedModal from '@/components/modals/BadgeEarnedModal';
import DrillVideoModal from '@/components/modals/DrillVideoModal';
import LogSessionModal from '@/components/modals/LogSessionModal';
import VinnieCelebrationModal from '@/components/modals/VinnieCelebrationModal';
import { useAllBadges } from '@/hooks/useBadges';
import { useProfile } from '@/hooks/useProfile';
import { useSubscription } from '@/hooks/useSubscription';
import { useDrills, useJugglingRecord, useTouchTracking } from '@/hooks/useTouchTracking';
import { useUser } from '@/hooks/useUser';
import { getLevelFromXp, isDrillUnlocked } from '@/lib/xp';
import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const DIFFICULTY_COLORS: Record<string, { bg: string; text: string }> = {
  beginner: { bg: '#E8F5E9', text: '#388E3C' },
  intermediate: { bg: '#FFF3E0', text: '#F57C00' },
  advanced: { bg: '#FFEBEE', text: '#D32F2F' },
};

export default function DrillLibraryScreen() {
  const { data: user } = useUser();
  const { data: profile } = useProfile(user?.id);
  const { isPremium } = useSubscription();
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: drills = [] } = useDrills();
  const { data: touchStats } = useTouchTracking(user?.id);
  const { data: jugglePB = 0 } = useJugglingRecord(user?.id);
  const { data: allBadges = [] } = useAllBadges();

  const playerLevel = getLevelFromXp(profile?.total_xp ?? 0).level;
  const basicDrills = drills.filter((d: any) => (d.drill_type ?? 'basic') === 'basic');
  const combinationDrills = drills
    .filter((d: any) => d.drill_type === 'combination')
    .sort((a: any, b: any) => (a.required_level ?? 1) - (b.required_level ?? 1));

  const [drillFilter, setDrillFilter] = useState<'all' | 'beginner' | 'intermediate' | 'advanced'>('beginner');
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoName, setVideoName] = useState('');
  const [videoDescription, setVideoDescription] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [challengeDrillId, setChallengeDrillId] = useState<string | undefined>();
  const [challengeName, setChallengeName] = useState<string | undefined>();
  const [showVinnieCelebration, setShowVinnieCelebration] = useState(false);
  const [celebrationTouches, setCelebrationTouches] = useState(0);
  const [earnedBadges, setEarnedBadges] = useState<string[]>([]);
  const [showBadgeModal, setShowBadgeModal] = useState(false);

  const drillsByDifficulty = {
    beginner: basicDrills.filter((d: any) => d.difficulty_level === 'beginner'),
    intermediate: basicDrills.filter((d: any) => d.difficulty_level === 'intermediate'),
    advanced: basicDrills.filter((d: any) => d.difficulty_level === 'advanced'),
  };

  const visibleLevels =
    drillFilter === 'all'
      ? (['beginner', 'intermediate', 'advanced'] as const)
      : ([drillFilter] as const);

  const handleSessionLogged = () => {
    queryClient.invalidateQueries({ queryKey: ['touch-tracking', user?.id] });
    queryClient.invalidateQueries({ queryKey: ['challenge-stats'] });
    queryClient.invalidateQueries({ queryKey: ['today-challenge'] });
  };

  return (
    <View style={styles.container}>
      <PageHeader
        title='Drill Library'
        showAvatar={false}
        rightComponent={
          <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
            <Ionicons name='close' size={24} color='#78909C' />
          </TouchableOpacity>
        }
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.drillFilterRow}>
          {(['beginner', 'intermediate', 'advanced', 'all'] as const).map((level) => (
            <TouchableOpacity
              key={level}
              style={[
                styles.drillFilterPill,
                drillFilter === level && styles.drillFilterPillActive,
                drillFilter === level && level !== 'all' && { backgroundColor: DIFFICULTY_COLORS[level].bg },
              ]}
              onPress={() => setDrillFilter(level)}
            >
              <Text
                style={[
                  styles.drillFilterPillText,
                  drillFilter === level && styles.drillFilterPillTextActive,
                  drillFilter === level && level !== 'all' && { color: DIFFICULTY_COLORS[level].text },
                ]}
              >
                {level === 'all' ? 'All' : level.charAt(0).toUpperCase() + level.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.drillHint}>
          Tap a drill to log a session · Tap{' '}
          <Text style={styles.drillHintPlay}>▶ Watch</Text> to see the video
        </Text>

        {visibleLevels.map((level) => {
          const levelDrills = drillsByDifficulty[level];
          if (levelDrills.length === 0) return null;
          const color = DIFFICULTY_COLORS[level];
          const levelLocked = !isPremium && level !== 'beginner';
          return (
            <View key={level} style={styles.difficultySection}>
              <View style={[styles.difficultyHeader, { backgroundColor: color.bg }]}>
                <Text style={[styles.difficultyLabel, { color: color.text }]}>
                  {level.toUpperCase()}
                </Text>
                {levelLocked && (
                  <Ionicons name='lock-closed' size={12} color={color.text} style={{ marginLeft: 6 }} />
                )}
              </View>
              <View style={styles.drillGrid}>
                {levelDrills.map((drill) => (
                  <View key={drill.id} style={[styles.drillCard, levelLocked && styles.drillCardLocked]}>
                    {levelLocked ? (
                      <View style={styles.drillThumbnailPlaceholderNoVideo} />
                    ) : drill.video_url ? (
                      <TouchableOpacity
                        style={styles.drillThumbnailContainer}
                        onPress={() => {
                          setVideoUrl(drill.video_url!);
                          setVideoName(drill.name);
                          setVideoDescription(drill.description ?? '');
                        }}
                        activeOpacity={0.85}
                      >
                        {drill.thumbnail_url ? (
                          <Image
                            source={{ uri: drill.thumbnail_url }}
                            style={styles.drillThumbnail}
                            resizeMode='cover'
                          />
                        ) : (
                          <View style={styles.drillThumbnailPlaceholder} />
                        )}
                        <View style={styles.drillPlayOverlay}>
                          <View style={styles.drillPlayButton}>
                            <Ionicons name='play' size={14} color='#FFF' />
                          </View>
                        </View>
                      </TouchableOpacity>
                    ) : (
                      <View style={styles.drillThumbnailPlaceholderNoVideo} />
                    )}
                    <TouchableOpacity
                      style={styles.drillTapArea}
                      onPress={() => {
                        if (levelLocked) {
                          router.push('/(modals)/paywall');
                          return;
                        }
                        setChallengeDrillId(drill.id);
                        setChallengeName(drill.name);
                        setModalVisible(true);
                      }}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.drillName}>{drill.name}</Text>
                      {drill.description && (
                        <Text style={styles.drillDescription}>{drill.description}</Text>
                      )}
                    </TouchableOpacity>
                    {levelLocked ? (
                      <View style={styles.drillLockedBadge}>
                        <Ionicons name='lock-closed' size={11} color='#78909C' />
                        <Text style={styles.drillLockedText}>Pro only</Text>
                      </View>
                    ) : !drill.video_url ? (
                      <View style={styles.comingSoonBadge}>
                        <Ionicons name='videocam-outline' size={11} color='#78909C' />
                        <Text style={styles.comingSoonText}>Video coming soon</Text>
                      </View>
                    ) : null}
                  </View>
                ))}
              </View>
            </View>
          );
        })}

        {/* COMBINATION MOVES */}
        {combinationDrills.length > 0 && (
          <View style={styles.combinationSection}>
            <View style={styles.combinationHeader}>
              <Text style={styles.combinationTitle}>Combination Moves</Text>
              <Text style={styles.combinationSubtitle}>Chain skills together like a real player</Text>
            </View>

            {combinationDrills.map((drill: any) => {
              const unlocked = isDrillUnlocked(playerLevel, drill.required_level ?? 1);
              return (
                <View key={drill.id} style={[styles.comboCard, !unlocked && styles.comboCardLocked]}>
                  <View style={styles.comboMain}>
                    <View style={styles.comboInfo}>
                      <View style={styles.comboNameRow}>
                        {!unlocked && (
                          <Ionicons name='lock-closed' size={13} color='#78909C' style={{ marginRight: 5 }} />
                        )}
                        <Text style={[styles.comboName, !unlocked && styles.comboNameLocked]}>
                          {drill.name}
                        </Text>
                      </View>
                      {unlocked && drill.coaching_point ? (
                        <Text style={styles.comboCoachingPoint}>{drill.coaching_point}</Text>
                      ) : !unlocked ? (
                        <Text style={styles.comboUnlockLabel}>Unlocks at Level {drill.required_level}</Text>
                      ) : null}
                    </View>
                    {drill.video_url && unlocked && (
                      <TouchableOpacity
                        style={styles.watchBtn}
                        onPress={() => {
                          setVideoUrl(drill.video_url);
                          setVideoName(drill.name);
                          setVideoDescription(drill.coaching_point ?? '');
                        }}
                        activeOpacity={0.7}
                      >
                        <Ionicons name='play-circle' size={18} color='#1f89ee' />
                        <Text style={styles.watchBtnText}>Watch</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      <VinnieCelebrationModal
        visible={showVinnieCelebration}
        touchCount={celebrationTouches}
        onClose={() => {
          setShowVinnieCelebration(false);
          if (earnedBadges.length) setShowBadgeModal(true);
        }}
      />

      <BadgeEarnedModal
        visible={showBadgeModal}
        badges={allBadges.filter((b) => earnedBadges.includes(b.id))}
        onClose={() => {
          setShowBadgeModal(false);
          setEarnedBadges([]);
        }}
      />

      {videoUrl && (
        <DrillVideoModal
          visible={!!videoUrl}
          onClose={() => setVideoUrl(null)}
          videoUrl={videoUrl}
          drillName={videoName}
          description={videoDescription}
        />
      )}

      {user?.id && (
        <LogSessionModal
          visible={modalVisible}
          onClose={() => {
            setModalVisible(false);
            setChallengeDrillId(undefined);
            setChallengeName(undefined);
          }}
          userId={user.id}
          onSuccess={handleSessionLogged}
          challengeDrillId={challengeDrillId}
          challengeName={challengeName}
          badgeContext={{
            totalSessions: touchStats?.total_sessions ?? 0,
            totalTouches: touchStats?.total_touches ?? 0,
            currentStreak: touchStats?.current_streak ?? 0,
            previousJugglePB: jugglePB,
            sessionsThisWeek: touchStats?.this_week_sessions ?? 0,
            teamId: profile?.team_id ?? null,
          }}
          onSessionLogged={(tc, _isChallenge, _drillName, earnedBadgeIds) => {
            setCelebrationTouches(tc);
            setShowVinnieCelebration(true);
            if (earnedBadgeIds?.length) setEarnedBadges(earnedBadgeIds);
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  closeButton: {
    padding: 4,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  drillFilterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  drillHint: {
    fontSize: 12,
    fontWeight: '600',
    color: '#78909C',
    marginBottom: 16,
  },
  drillHintPlay: {
    color: '#31af4d',
    fontWeight: '700',
  },
  drillFilterPill: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: '#F0F2F5',
  },
  drillFilterPillActive: {
    backgroundColor: '#1f89ee',
  },
  drillFilterPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#78909C',
  },
  drillFilterPillTextActive: {
    color: '#FFF',
  },
  difficultySection: {
    marginBottom: 16,
  },
  difficultyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 10,
  },
  difficultyLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  drillGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  drillCard: {
    width: '48%',
    backgroundColor: '#FFF',
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  drillCardLocked: {
    opacity: 0.5,
  },
  drillThumbnailContainer: {
    height: 90,
    width: '100%',
  },
  drillThumbnail: {
    width: '100%',
    height: '100%',
  },
  drillThumbnailPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#E8F5E9',
  },
  drillThumbnailPlaceholderNoVideo: {
    width: '100%',
    height: 6,
    backgroundColor: '#E0E0E0',
  },
  drillPlayOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  drillPlayButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#31af4d',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  drillTapArea: {
    padding: 10,
  },
  drillName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1a1a2e',
    marginBottom: 4,
  },
  drillDescription: {
    fontSize: 12,
    fontWeight: '600',
    color: '#78909C',
    lineHeight: 17,
    marginBottom: 4,
  },
  drillLockedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingBottom: 8,
  },
  drillLockedText: {
    fontSize: 11,
    color: '#78909C',
    fontWeight: '700',
  },
  comingSoonBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingBottom: 8,
  },
  comingSoonText: {
    fontSize: 11,
    color: '#78909C',
    fontWeight: '600',
  },

  // COMBINATION SECTION
  combinationSection: {
    marginTop: 8,
  },
  combinationHeader: {
    marginBottom: 12,
  },
  combinationTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: '#1a1a2e',
    marginBottom: 3,
  },
  combinationSubtitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#78909C',
  },
  comboCard: {
    backgroundColor: '#FFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1.5,
    borderColor: '#E8EAED',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  comboCardLocked: {
    backgroundColor: '#F9FAFB',
    borderColor: '#E8EAED',
    opacity: 0.7,
  },
  comboMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  comboInfo: {
    flex: 1,
  },
  comboNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  comboName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1a1a2e',
  },
  comboNameLocked: {
    color: '#78909C',
  },
  comboCoachingPoint: {
    fontSize: 13,
    fontWeight: '600',
    color: '#78909C',
    lineHeight: 18,
  },
  comboUnlockLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1f89ee',
  },
  watchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#EBF4FF',
    borderRadius: 8,
  },
  watchBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1f89ee',
  },
});
