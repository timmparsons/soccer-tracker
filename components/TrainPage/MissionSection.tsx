import DrillVideoModal from '@/components/modals/DrillVideoModal';
import { useDailyChallenge } from '@/hooks/useDailyChallenge';
import { getVinnieMissionCelebration } from '@/lib/vinnie';
import { getLevelFromXp } from '@/lib/xp';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Image,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const MISSION_PURPOSES: Record<string, string> = {
  'Ball Mastery': 'Build comfort and confidence on the ball.',
  'Weak Foot': 'Develop a stronger and more reliable weak foot.',
  'Juggling': 'Improve coordination, balance, and touch.',
  'Turns': 'Learn to escape pressure and change direction quickly.',
  'Speed Work': 'Execute technical skills at game speed.',
  '1v1 Skills': 'Develop creativity and confidence in attacking situations.',
  'Full Session': 'Combine all key technical skills into one complete session.',
};

const MISSION_TIMES: Record<string, string> = {
  'Ball Mastery': '8 min',
  'Weak Foot': '8 min',
  'Juggling': '5 min',
  'Turns': '8 min',
  'Speed Work': '10 min',
  '1v1 Skills': '10 min',
  'Full Session': '15 min',
};

const MISSION_SKILLS: Record<string, string[]> = {
  'Ball Mastery': ['Ball Control', 'Coordination', 'Confidence'],
  'Weak Foot': ['Weak Foot', 'Balance', 'Ball Mastery'],
  'Juggling': ['Coordination', 'Touch Sensitivity', 'Focus'],
  'Turns': ['Turning', 'Change of Direction', 'Escaping Pressure'],
  'Speed Work': ['Speed', 'Ball Control', 'Quick Feet'],
  '1v1 Skills': ['Creativity', 'Confidence', 'Attacking Skills'],
  'Full Session': ['Ball Mastery', 'Turning', 'Coordination'],
};

const DIFFICULTY_COLORS: Record<string, { text: string }> = {
  beginner: { text: '#388E3C' },
  intermediate: { text: '#F57C00' },
  advanced: { text: '#D32F2F' },
  elite: { text: '#512DA8' },
};

interface MissionSectionProps {
  userId: string;
  totalXp: number;
  todayTouches?: number;
  dailyTarget?: number;
  onComplete?: () => void;
}

export default function MissionSection({ userId, totalXp, todayTouches = 0, dailyTarget = 1000, onComplete }: MissionSectionProps) {
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
    totalMissionTouches,
  } = useDailyChallenge(userId, totalXp);

  const [showCelebration, setShowCelebration] = useState(false);
  const [earnedXp, setEarnedXp] = useState(0);
  const [earnedTouches, setEarnedTouches] = useState(0);
  const [vinnieMessage, setVinnieMessage] = useState('');
  const [togglingDrillId, setTogglingDrillId] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoName, setVideoName] = useState('');
  const scaleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (showCelebration) {
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }).start();
    } else {
      scaleAnim.setValue(0);
    }
  }, [showCelebration, scaleAnim]);

  const { level, xpIntoLevel, xpForNextLevel } = getLevelFromXp(totalXp + earnedXp);
  const xpPct = xpForNextLevel > 0 ? Math.round((xpIntoLevel / xpForNextLevel) * 100) : 100;

  if (isLoading) {
    return (
      <View style={styles.loadingBox}>
        <ActivityIndicator size='small' color='#1f89ee' />
      </View>
    );
  }

  if (!template) return null;

  const difficulty = template.difficulty ?? 'intermediate';
  const diffColor = DIFFICULTY_COLORS[difficulty] ?? DIFFICULTY_COLORS.intermediate;
  const purpose = template.category ? MISSION_PURPOSES[template.category] : null;
  const estimatedTime = template.category ? MISSION_TIMES[template.category] : null;
  const skills = template.category ? MISSION_SKILLS[template.category] : null;

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
              setVinnieMessage(getVinnieMissionCelebration());
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
    <>
      {/* Single bordered card containing hero + drills */}
      <View style={[styles.missionCard, isCompleted && styles.missionCardDone]}>
        {/* Hero */}
        <Text style={styles.heroLabel}>{"TODAY'S MISSION"}</Text>

        <Text style={styles.heroName}>{template.category ?? template.name}</Text>

        <View style={styles.diffRow}>
          <Text style={[styles.diffLabel, { color: diffColor.text }]}>
            {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)} Mission
          </Text>
          {estimatedTime && (
            <>
              <Text style={styles.metaSep}>·</Text>
              <Ionicons name='time-outline' size={13} color='#78909C' />
              <Text style={styles.timeLabel}>{estimatedTime}</Text>
            </>
          )}
        </View>

        {purpose && <Text style={styles.heroPurpose}>{purpose}</Text>}

        {isCompleted ? (
          <View style={styles.earnedBadge}>
            <Text style={styles.earnedEmoji}>🏆</Text>
            <Text style={styles.earnedText}>+{template.xp_reward} XP Earned</Text>
          </View>
        ) : (
          <View style={styles.heroMeta}>
            <View style={styles.xpPill}>
              <Text style={styles.xpPillText}>Earn +{template.xp_reward} XP</Text>
            </View>
            {totalMissionTouches > 0 && (
              <View style={styles.touchesPill}>
                <Text style={styles.touchesPillText}>{totalMissionTouches} touches</Text>
              </View>
            )}
          </View>
        )}

        {/* Divider */}
        <View style={styles.divider} />

        {/* Drills */}
        {drillsLoading ? (
          <ActivityIndicator size='small' color='#1f89ee' style={{ marginVertical: 8 }} />
        ) : drills.length === 0 ? (
          <Text style={styles.descriptionText}>{template.description}</Text>
        ) : (
          <>
            <View style={styles.drillsHeader}>
              <Text style={styles.drillsLabel}>Mission Tasks</Text>
              <Text style={styles.drillsProgress}>
                {completedDrillIds.length}/{drills.length} Complete
              </Text>
            </View>

            {drills.map((drill) => {
              const done = completedDrillIds.includes(drill.id);
              const toggling = togglingDrillId === drill.id;
              return (
                <View key={drill.id} style={[styles.drillRow, done && styles.drillRowDone]}>
                  <TouchableOpacity
                    style={[styles.checkbox, done && styles.checkboxDone]}
                    onPress={() => handleDrillToggle(drill.id)}
                    disabled={done || isCompleted || toggling}
                    activeOpacity={0.7}
                  >
                    {toggling ? (
                      <ActivityIndicator size='small' color='#FFF' />
                    ) : done ? (
                      <Ionicons name='checkmark' size={14} color='#FFF' />
                    ) : null}
                  </TouchableOpacity>

                  <View style={styles.drillInfo}>
                    <Text style={[styles.drillName, done && styles.drillNameDone]}>
                      {drill.drill_name}
                    </Text>
                    {drill.target_reps && (
                      <Text style={styles.drillReps}>{drill.target_reps} reps · {drill.touch_value} touches</Text>
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
              );
            })}

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
          </>
        )}

        {/* Skills Developed */}
        {skills && (
          <>
            <View style={styles.divider} />
            <Text style={styles.skillsLabel}>Skills Developed</Text>
            <View style={styles.skillsRow}>
              {skills.map((skill) => (
                <View key={skill} style={styles.skillChip}>
                  <Ionicons name='checkmark' size={11} color='#31af4d' />
                  <Text style={styles.skillChipText}>{skill}</Text>
                </View>
              ))}
            </View>
          </>
        )}
      </View>

      {/* Video modal */}
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
          <Animated.View style={[styles.celebrationCard, { transform: [{ scale: scaleAnim }] }]}>
            {/* Vinnie */}
            <Image
              source={require('@/assets/images/vinnie.png')}
              style={styles.vinnieImage}
              resizeMode='contain'
            />

            {/* Speech bubble */}
            <View style={styles.speechTail} />
            <View style={styles.speechBubble}>
              <Text style={styles.speechText}>{vinnieMessage} — Coach Vinnie</Text>
            </View>

            {/* Rewards */}
            <View style={styles.rewardsRow}>
              <View style={styles.rewardPill}>
                <Text style={styles.rewardValue}>+{earnedXp}</Text>
                <Text style={styles.rewardLabel}>XP</Text>
              </View>
              {earnedTouches > 0 && (
                <View style={styles.rewardPill}>
                  <Text style={styles.rewardValue}>+{earnedTouches}</Text>
                  <Text style={styles.rewardLabel}>Touches</Text>
                </View>
              )}
              <View style={styles.rewardPill}>
                <Text style={styles.rewardValue}>+1</Text>
                <Text style={styles.rewardLabel}>Session</Text>
              </View>
            </View>

            {/* Level progress */}
            <View style={styles.levelBlock}>
              <View style={styles.levelRow}>
                <Text style={styles.levelLabel}>Level {level}</Text>
                <Text style={styles.levelXpUntil}>
                  {(xpForNextLevel - xpIntoLevel).toLocaleString()} XP to Level {level + 1}
                </Text>
              </View>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${xpPct}%` }]} />
              </View>
            </View>

            {/* Touch progress */}
            {(() => {
              const totalAfterMission = todayTouches + earnedTouches;
              const remaining = Math.max(0, dailyTarget - totalAfterMission);
              const pct = Math.min(Math.round((totalAfterMission / dailyTarget) * 100), 100);
              return (
                <View style={styles.touchProgressBlock}>
                  <View style={styles.touchProgressBar}>
                    <View style={[styles.touchProgressFill, { width: `${pct}%` }]} />
                  </View>
                  <Text style={styles.touchProgressText}>
                    {totalAfterMission.toLocaleString()} / {dailyTarget.toLocaleString()} touches today
                  </Text>
                  {remaining > 0 && (
                    <Text style={styles.touchProgressCta}>
                      {remaining.toLocaleString()} more to hit your daily goal
                    </Text>
                  )}
                </View>
              );
            })()}

            <TouchableOpacity
              style={styles.closeBtn}
              onPress={() => {
                setShowCelebration(false);
                onComplete?.();
              }}
            >
              <Text style={styles.closeBtnText}>
                {Math.max(0, dailyTarget - todayTouches - earnedTouches) > 0
                  ? 'Keep Training'
                  : 'Goal Complete!'}
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  loadingBox: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  missionCard: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 18,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#FED7AA',
    shadowColor: '#ffb724',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3,
  },
  missionCardDone: {
    borderColor: '#BBF7D0',
    shadowColor: '#31af4d',
  },
  divider: {
    height: 1,
    backgroundColor: '#F0F2F5',
    marginVertical: 14,
  },
  heroLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#78909C',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  heroName: {
    fontSize: 26,
    fontWeight: '900',
    color: '#1a1a2e',
    marginBottom: 4,
  },
  diffRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
  },
  diffLabel: {
    fontSize: 13,
    fontWeight: '800',
  },
  metaSep: {
    fontSize: 13,
    color: '#C4C9D4',
    marginHorizontal: 2,
  },
  timeLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#78909C',
  },
  heroPurpose: {
    fontSize: 13,
    fontWeight: '600',
    color: '#78909C',
    lineHeight: 20,
    marginBottom: 12,
  },
  earnedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: '#DCFCE7',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  earnedEmoji: {
    fontSize: 14,
  },
  earnedText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#15803D',
  },
  heroMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  xpPill: {
    backgroundColor: '#FEF9EC',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1.5,
    borderColor: '#ffb724',
  },
  xpPillText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#ffb724',
  },
  touchesPill: {
    backgroundColor: '#F0F9FF',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1.5,
    borderColor: '#BAE6FD',
  },
  touchesPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0369A1',
  },
  descriptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#78909C',
    lineHeight: 21,
  },
  drillsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  drillsLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: '#78909C',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  drillsProgress: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1f89ee',
  },
  drillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F7FA',
  },
  drillRowDone: {
    opacity: 0.7,
  },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: 7,
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
    fontSize: 12,
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
    fontSize: 12,
    fontWeight: '700',
    color: '#1f89ee',
  },
  completeBtn: {
    backgroundColor: '#31af4d',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 14,
  },
  completeBtnDisabled: {
    backgroundColor: '#E0E0E0',
  },
  completeBtnText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#FFF',
  },

  // CELEBRATION MODAL
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  celebrationCard: {
    backgroundColor: '#FFF',
    borderRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 28,
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 12,
  },
  vinnieImage: {
    width: 180,
    height: 100,
  },
  speechTail: {
    width: 0,
    height: 0,
    borderLeftWidth: 10,
    borderRightWidth: 10,
    borderBottomWidth: 14,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#E8E8E8',
  },
  speechBubble: {
    backgroundColor: '#E8E8E8',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    width: '100%',
    alignItems: 'center',
    marginBottom: 16,
  },
  speechText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1a1a2e',
    textAlign: 'center',
    lineHeight: 22,
  },
  rewardsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  rewardPill: {
    backgroundColor: '#F0F9FF',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#BAE6FD',
    minWidth: 64,
  },
  rewardValue: {
    fontSize: 17,
    fontWeight: '900',
    color: '#0369A1',
  },
  rewardLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#78909C',
    marginTop: 2,
  },
  levelBlock: {
    width: '100%',
    marginBottom: 12,
  },
  levelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  levelLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1a1a2e',
  },
  levelXpUntil: {
    fontSize: 12,
    fontWeight: '600',
    color: '#78909C',
  },
  progressTrack: {
    width: '100%',
    height: 7,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#1f89ee',
    borderRadius: 4,
  },
  closeBtn: {
    backgroundColor: '#1f89ee',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 32,
    width: '100%',
    alignItems: 'center',
  },
  touchProgressBlock: {
    width: '100%',
    marginBottom: 16,
  },
  touchProgressBar: {
    width: '100%',
    height: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 6,
  },
  touchProgressFill: {
    height: '100%',
    backgroundColor: '#31af4d',
    borderRadius: 3,
  },
  touchProgressText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1a1a2e',
    textAlign: 'center',
    marginBottom: 4,
  },
  touchProgressCta: {
    fontSize: 12,
    fontWeight: '600',
    color: '#78909C',
    textAlign: 'center',
  },
  closeBtnText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FFF',
  },
  skillsLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#78909C',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  skillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  skillChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F0FDF4',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  skillChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#15803D',
  },
});
