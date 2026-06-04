import DrillVideoModal from '@/components/modals/DrillVideoModal';
import { useDailyChallenge } from '@/hooks/useDailyChallenge';
import { useProfile } from '@/hooks/useProfile';
import { useUser } from '@/hooks/useUser';
import { getLevelFromXp } from '@/lib/xp';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const MISSION_PURPOSES: Record<string, string> = {
  'Ball Mastery': 'Build comfort and confidence on the ball.',
  'Weak Foot': 'Develop a stronger and more reliable weak foot.',
  'Juggling': 'Improve coordination, balance, and touch.',
  'Turns': 'Learn to escape pressure and change direction quickly.',
  'Speed Work': 'Execute technical skills at game speed.',
  '1v1 Skills': 'Develop creativity and confidence in attacking situations.',
  'Full Session': 'Combine all key technical skills into one session.',
};

const DIFFICULTY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  beginner: { bg: '#E8F5E9', text: '#388E3C', border: '#A5D6A7' },
  intermediate: { bg: '#FFF3E0', text: '#F57C00', border: '#FFCC80' },
  advanced: { bg: '#FFEBEE', text: '#D32F2F', border: '#EF9A9A' },
  elite: { bg: '#EDE7F6', text: '#512DA8', border: '#CE93D8' },
};

export default function MissionScreen() {
  const router = useRouter();
  const { data: user } = useUser();
  const { data: profile } = useProfile(user?.id);
  const totalXp = profile?.total_xp ?? 0;

  const {
    template,
    drills,
    isCompleted,
    completedDrillIds,
    allDrillsDone,
    isLoading,
    drillsLoading,
    completeDrill,
    complete,
    completing,
    playerDifficulty,
    totalMissionTouches,
  } = useDailyChallenge(user?.id, totalXp);

  const [showCelebration, setShowCelebration] = useState(false);
  const [earnedXp, setEarnedXp] = useState(0);
  const [earnedTouches, setEarnedTouches] = useState(0);
  const [togglingDrillId, setTogglingDrillId] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoName, setVideoName] = useState('');

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size='large' color='#1f89ee' />
        </View>
      </SafeAreaView>
    );
  }

  if (!template) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
            <Ionicons name='close' size={24} color='#78909C' />
          </TouchableOpacity>
        </View>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No mission available today.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const difficulty = template.difficulty ?? playerDifficulty;
  const diffColor = DIFFICULTY_COLORS[difficulty];
  const xpReward = template.xp_reward;

  const { level, xpIntoLevel, xpForNextLevel } = getLevelFromXp(totalXp + earnedXp);
  const xpPct = xpForNextLevel > 0 ? Math.round((xpIntoLevel / xpForNextLevel) * 100) : 100;

  const handleDrillToggle = async (drillId: string) => {
    if (completedDrillIds.includes(drillId) || isCompleted) return;
    setTogglingDrillId(drillId);
    try {
      await completeDrill(drillId);
    } catch {
      Alert.alert('Error', 'Could not save. Try again.');
    } finally {
      setTogglingDrillId(null);
    }
  };

  const handleCompleteMission = () => {
    Alert.alert(
      'Complete Mission?',
      'Confirm you finished all drills.',
      [
        { text: 'Not yet', style: 'cancel' },
        {
          text: 'Complete!',
          onPress: async () => {
            try {
              const result = await complete() as { xp: number; touches: number };
              setEarnedXp(result.xp);
              setEarnedTouches(result.touches);
              setShowCelebration(true);
            } catch {
              Alert.alert('Error', 'Could not save. Try again.');
            }
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
          <Ionicons name='close' size={24} color='#78909C' />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{"Today's Mission"}</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Mission title card */}
        <View style={[styles.missionCard, { borderColor: diffColor.border }]}>
          <Text style={styles.missionName}>{template.category ?? template.name}</Text>
          {(template.category && MISSION_PURPOSES[template.category]) && (
            <Text style={styles.missionPurpose}>
              {MISSION_PURPOSES[template.category]}
            </Text>
          )}
          <View style={styles.missionMeta}>
            <View style={[styles.diffPill, { backgroundColor: diffColor.bg }]}>
              <Text style={[styles.diffPillText, { color: diffColor.text }]}>
                {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
              </Text>
            </View>
            <View style={styles.xpPill}>
              <Text style={styles.xpPillText}>
                {isCompleted ? `+${xpReward} XP` : `Earn +${xpReward} XP`}
              </Text>
            </View>
            {totalMissionTouches > 0 && (
              <View style={styles.touchesPill}>
                <Text style={styles.touchesPillText}>{totalMissionTouches} touches</Text>
              </View>
            )}
            {drills.length > 0 && (
              <View style={[styles.completedPill, isCompleted && styles.completedPillDone]}>
                <Ionicons
                  name={isCompleted ? 'checkmark-circle' : 'ellipse-outline'}
                  size={14}
                  color={isCompleted ? '#31af4d' : '#78909C'}
                />
                <Text style={[styles.completedPillText, !isCompleted && { color: '#78909C' }]}>
                  {completedDrillIds.length}/{drills.length} Drills
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Drills */}
        {drillsLoading ? (
          <ActivityIndicator size='small' color='#1f89ee' style={{ marginTop: 20 }} />
        ) : drills.length === 0 ? (
          <View style={styles.noDrillsCard}>
            <Text style={styles.noDrillsText}>{template.description}</Text>
          </View>
        ) : (
          <>
            <Text style={styles.sectionLabel}>Drills</Text>
            {drills.map((drill) => {
              const done = completedDrillIds.includes(drill.id);
              const toggling = togglingDrillId === drill.id;
              return (
                <View key={drill.id} style={[styles.drillCard, done && styles.drillCardDone]}>
                  <View style={styles.drillMain}>
                    <TouchableOpacity
                      style={[styles.checkbox, done && styles.checkboxDone]}
                      onPress={() => handleDrillToggle(drill.id)}
                      disabled={done || isCompleted || toggling}
                      activeOpacity={0.7}
                    >
                      {toggling ? (
                        <ActivityIndicator size='small' color='#FFF' />
                      ) : done ? (
                        <Ionicons name='checkmark' size={16} color='#FFF' />
                      ) : null}
                    </TouchableOpacity>

                    <View style={styles.drillInfo}>
                      <Text style={[styles.drillName, done && styles.drillNameDone]}>
                        {drill.drill_name}
                      </Text>
                      {drill.target_reps && (
                        <Text style={styles.drillReps}>{drill.target_reps} reps</Text>
                      )}
                    </View>

                    {drill.drill_video_url && (
                      <TouchableOpacity
                        style={styles.watchBtn}
                        onPress={() => {
                          setVideoUrl(drill.drill_video_url!);
                          setVideoName(drill.drill_name);
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
          </>
        )}

        {/* Complete button */}
        {!isCompleted && (
          <TouchableOpacity
            style={[
              styles.completeBtn,
              (!allDrillsDone || completing) && styles.completeBtnDisabled,
            ]}
            onPress={handleCompleteMission}
            disabled={!allDrillsDone || completing}
            activeOpacity={0.85}
          >
            {completing ? (
              <ActivityIndicator size='small' color='#FFF' />
            ) : (
              <Text style={styles.completeBtnText}>
                {allDrillsDone ? 'Complete Mission' : `${completedDrillIds.length}/${drills.length} drills done`}
              </Text>
            )}
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Drill video */}
      {videoUrl && (
        <DrillVideoModal
          visible={!!videoUrl}
          onClose={() => setVideoUrl(null)}
          videoUrl={videoUrl}
          drillName={videoName}
        />
      )}

      {/* Celebration modal */}
      <Modal
        visible={showCelebration}
        transparent
        animationType='fade'
        hardwareAccelerated
        statusBarTranslucent={Platform.OS === 'android'}
      >
        <View style={styles.overlay}>
          <View style={styles.celebrationCard}>
            <Text style={styles.celebrationEmoji}>🎉</Text>
            <Text style={styles.celebrationTitle}>Mission Complete!</Text>

            <View style={styles.rewardsRow}>
              <View style={styles.rewardPill}>
                <Text style={styles.rewardPillValue}>+{earnedXp}</Text>
                <Text style={styles.rewardPillLabel}>XP</Text>
              </View>
              {earnedTouches > 0 && (
                <View style={styles.rewardPill}>
                  <Text style={styles.rewardPillValue}>+{earnedTouches}</Text>
                  <Text style={styles.rewardPillLabel}>Touches</Text>
                </View>
              )}
              <View style={styles.rewardPill}>
                <Text style={styles.rewardPillValue}>+1</Text>
                <Text style={styles.rewardPillLabel}>Session</Text>
              </View>
            </View>

            <View style={styles.streakRow}>
              <Text style={styles.streakEmoji}>🔥</Text>
              <Text style={styles.streakText}>Streak Maintained</Text>
            </View>

            <View style={styles.levelBlock}>
              <Text style={styles.levelLabel}>Level {level}</Text>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${xpPct}%` }]} />
              </View>
              <Text style={styles.progressLabel}>
                {(xpForNextLevel - xpIntoLevel).toLocaleString()} XP until Level {level + 1}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.closeModalBtn}
              onPress={() => {
                setShowCelebration(false);
                router.back();
              }}
            >
              <Text style={styles.closeModalBtnText}>Keep Going!</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#78909C',
    textAlign: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#F5F7FA',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1a1a2e',
  },
  closeBtn: {
    padding: 4,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 48,
  },
  missionCard: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  missionName: {
    fontSize: 26,
    fontWeight: '900',
    color: '#1a1a2e',
    marginBottom: 12,
  },
  missionMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  diffPill: {
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  diffPillText: {
    fontSize: 13,
    fontWeight: '800',
  },
  xpPill: {
    backgroundColor: '#FEF9EC',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderWidth: 1.5,
    borderColor: '#ffb724',
  },
  xpPillText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#ffb724',
  },
  touchesPill: {
    backgroundColor: '#F0F9FF',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderWidth: 1.5,
    borderColor: '#BAE6FD',
  },
  touchesPillText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0369A1',
  },
  completedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F5F7FA',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  completedPillDone: {
    backgroundColor: '#DCFCE7',
  },
  completedPillText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#31af4d',
  },
  missionPurpose: {
    fontSize: 14,
    fontWeight: '600',
    color: '#78909C',
    lineHeight: 20,
    marginBottom: 12,
    marginTop: -4,
  },
  noDrillsCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
  },
  noDrillsText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#78909C',
    lineHeight: 22,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: '#78909C',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  drillCard: {
    backgroundColor: '#FFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  drillCardDone: {
    backgroundColor: '#F0FDF4',
  },
  drillMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    backgroundColor: '#F5F7FA',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  checkboxDone: {
    backgroundColor: '#31af4d',
    borderColor: '#31af4d',
  },
  drillInfo: {
    flex: 1,
  },
  drillName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1a1a2e',
  },
  drillNameDone: {
    color: '#78909C',
    textDecorationLine: 'line-through',
  },
  drillReps: {
    fontSize: 13,
    fontWeight: '600',
    color: '#78909C',
    marginTop: 2,
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
    fontSize: 13,
    fontWeight: '700',
    color: '#1f89ee',
  },
  completeBtn: {
    backgroundColor: '#31af4d',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  completeBtnDisabled: {
    backgroundColor: '#E0E0E0',
  },
  completeBtnText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FFF',
  },

  // CELEBRATION MODAL
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  celebrationCard: {
    backgroundColor: '#FFF',
    borderRadius: 28,
    padding: 32,
    alignItems: 'center',
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 12,
  },
  celebrationEmoji: {
    fontSize: 52,
    marginBottom: 10,
  },
  celebrationTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#1a1a2e',
    marginBottom: 18,
  },
  rewardsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  rewardPill: {
    backgroundColor: '#F0F9FF',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#BAE6FD',
    minWidth: 72,
  },
  rewardPillValue: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0369A1',
  },
  rewardPillLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#78909C',
    marginTop: 2,
  },
  streakRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFF7ED',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginBottom: 18,
  },
  streakEmoji: {
    fontSize: 16,
  },
  streakText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#C2410C',
  },
  levelBlock: {
    width: '100%',
    marginBottom: 22,
  },
  levelLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1a1a2e',
    marginBottom: 8,
    textAlign: 'center',
  },
  progressTrack: {
    width: '100%',
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#1f89ee',
    borderRadius: 4,
  },
  progressLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#78909C',
    textAlign: 'center',
  },
  closeModalBtn: {
    backgroundColor: '#1f89ee',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 32,
    width: '100%',
    alignItems: 'center',
  },
  closeModalBtnText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FFF',
  },
});
