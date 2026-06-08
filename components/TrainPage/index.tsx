import PageHeader from '@/components/common/PageHeader';
import { getTodayFocus, TRAINING_FOCUS_CATEGORIES, FocusKey } from '@/lib/trainingFocus';
import BadgeEarnedModal from '@/components/modals/BadgeEarnedModal';
import LogSessionModal from '@/components/modals/LogSessionModal';
import TeamBadgeEarnedModal from '@/components/TeamBadgeEarnedModal';
import VinnieCelebrationModal from '@/components/modals/VinnieCelebrationModal';
import { useAllBadges } from '@/hooks/useBadges';
import { getCurrentWeekChallenge } from '@/lib/teamBadges';
import { getTimedRank } from '@/hooks/useTimedChallengeLeaderboard';
import { useProfile } from '@/hooks/useProfile';
import { useSubscription } from '@/hooks/useSubscription';
import { useJugglingRecord, useTouchTracking, useFocusDrills, useTodayChallenge } from '@/hooks/useTouchTracking';
import DrillVideoModal from '@/components/modals/DrillVideoModal';
import { useUser } from '@/hooks/useUser';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { getLocalDate } from '@/utils/getLocalDate';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  Vibration,
  View,
} from 'react-native';


const FREE_TIMER_SECONDS = new Set([60, 300]); // 1 min + 5 min

const TrainPage = () => {
  const { data: user } = useUser();
  const { data: profile } = useProfile(user?.id);
  const { isPremium } = useSubscription();
  const router = useRouter();
  const [modalVisible, setModalVisible] = useState(false);
  // Timer state
  const [showTimerModal, setShowTimerModal] = useState(false);
  const [timerRunning, setTimerRunning] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [showScoreModal, setShowScoreModal] = useState(false);
  const [scoreInput, setScoreInput] = useState('');
  const [submittingScore, setSubmittingScore] = useState(false);
  const [freeTimerDuration, setFreeTimerDuration] = useState(0);
  const [showTimerPicker, setShowTimerPicker] = useState(false);
  const [timerChallengeDrillId, setTimerChallengeDrillId] = useState<string | undefined>();
  const [timerChallengeName, setTimerChallengeName] = useState<string | undefined>();
  const [timedRank, setTimedRank] = useState<number | null>(null);
  const [showVinnieCelebration, setShowVinnieCelebration] = useState(false);
  const [celebrationTouches, setCelebrationTouches] = useState(0);
  const [earnedBadges, setEarnedBadges] = useState<string[]>([]);
  const [showBadgeModal, setShowBadgeModal] = useState(false);
  const [earnedTeamBadgeIds, setEarnedTeamBadgeIds] = useState<string[]>([]);
  const [showTeamBadgeModal, setShowTeamBadgeModal] = useState(false);
  const { data: allBadges = [] } = useAllBadges();
  const [customMinutes, setCustomMinutes] = useState('');
  const [customSeconds, setCustomSeconds] = useState('');
  const [timerFocus, setTimerFocus] = useState<FocusKey>(() => getTodayFocus().key);
  const [timerPickerStep, setTimerPickerStep] = useState<'focus' | 'duration'>('focus');
  const [drillVideoUrl, setDrillVideoUrl] = useState<string>('');
  const [drillVideoName, setDrillVideoName] = useState<string>('');
  const [showDrillVideo, setShowDrillVideo] = useState(false);
  const [checkedDrills, setCheckedDrills] = useState<Set<string>>(new Set());
  const [isWorkoutExpanded, setIsWorkoutExpanded] = useState(true);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const whistleSoundRef = useRef<Audio.Sound | null>(null);
  const endTimeRef = useRef<number>(0);
  const pausedRemainingRef = useRef<number>(0);
  const timerNotificationIdRef = useRef<string | null>(null);
  const whistlePlayedRef = useRef<boolean>(false);

  // Speed challenge state
  const [speedTarget, setSpeedTarget] = useState<100 | 200 | null>(null);
  const [speedElapsed, setSpeedElapsed] = useState(0);
  const [speedRunning, setSpeedRunning] = useState(false);
  const [showSpeedTimer, setShowSpeedTimer] = useState(false);
  const [showSpeedResult, setShowSpeedResult] = useState(false);
  const [submittingSpeed, setSubmittingSpeed] = useState(false);
  const speedIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const speedStartRef = useRef<number>(0);

  const TIMER_OPTIONS = [
    { label: '30 sec', seconds: 30 },
    { label: '1 min', seconds: 60 },
    { label: '2 min', seconds: 120 },
    { label: '3 min', seconds: 180 },
    { label: '5 min', seconds: 300 },
    { label: '10 min', seconds: 600 },
  ];

  // Load timer sounds + set up Android notification channel
  useEffect(() => {
    Audio.Sound.createAsync(
      require('@/assets/sounds/fulltime_whistle.mp3'),
    ).then(({ sound }) => {
      whistleSoundRef.current = sound;
    });

    if (Platform.OS === 'android') {
      Notifications.setNotificationChannelAsync('timer', {
        name: 'Training Timer',
        importance: Notifications.AndroidImportance.HIGH,
        sound: 'fulltime_whistle.wav',
      }).catch(() => {});
    }

    return () => {
      whistleSoundRef.current?.unloadAsync();
    };
  }, []);

  const queryClient = useQueryClient();
  const { data: touchStats, isLoading, refetch } = useTouchTracking(user?.id);
  const { data: jugglePB = 0 } = useJugglingRecord(user?.id);
  const todayFocus = getTodayFocus();
  const { data: focusDrills = [] } = useFocusDrills(todayFocus.key);
  const { data: todayChallenge } = useTodayChallenge(user?.id);

  const { data: pb100 = null } = useQuery({
    queryKey: ['speed-pb', user?.id, 'speed_100'],
    queryFn: async () => {
      const { data } = await supabase
        .from('daily_sessions')
        .select('challenge_duration_seconds')
        .eq('user_id', user!.id)
        .eq('challenge_type', 'speed_100')
        .order('challenge_duration_seconds', { ascending: true })
        .limit(1)
        .maybeSingle();
      return data?.challenge_duration_seconds ?? null;
    },
    enabled: !!user?.id,
  });

  const { data: pb200 = null } = useQuery({
    queryKey: ['speed-pb', user?.id, 'speed_200'],
    queryFn: async () => {
      const { data } = await supabase
        .from('daily_sessions')
        .select('challenge_duration_seconds')
        .eq('user_id', user!.id)
        .eq('challenge_type', 'speed_200')
        .order('challenge_duration_seconds', { ascending: true })
        .limit(1)
        .maybeSingle();
      return data?.challenge_duration_seconds ?? null;
    },
    enabled: !!user?.id,
  });

  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const handleSessionLogged = (includesChallengeInvalidation = false) => {
    refetch();
    if (includesChallengeInvalidation) {
      queryClient.invalidateQueries({ queryKey: ['challenge-stats'] });
      queryClient.invalidateQueries({ queryKey: ['today-challenge'] });
    }
  };

  // Timer logic
  const startFreeTimer = useCallback(
    (seconds: number) => {
      setFreeTimerDuration(seconds);
      setTimeRemaining(seconds);
      pausedRemainingRef.current = seconds;
      setShowTimerPicker(false);
      setShowTimerModal(true);
    },
    [],
  );

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setTimerRunning(false);
  }, []);

  const pauseResumeTimer = useCallback(() => {
    setTimerRunning((prev) => !prev);
  }, []);

  const resetTimer = useCallback(() => {
    stopTimer();
    pausedRemainingRef.current = freeTimerDuration;
    setTimeRemaining(freeTimerDuration);
  }, [stopTimer, freeTimerDuration]);

  useEffect(() => {
    if (speedRunning) {
      speedStartRef.current = Date.now();
      speedIntervalRef.current = setInterval(() => {
        setSpeedElapsed(Math.round((Date.now() - speedStartRef.current) / 1000));
      }, 500);
    }
    return () => {
      if (speedIntervalRef.current) {
        clearInterval(speedIntervalRef.current);
        speedIntervalRef.current = null;
      }
    };
  }, [speedRunning]);

  const startSpeedChallenge = (target: 100 | 200) => {
    setSpeedTarget(target);
    setSpeedElapsed(0);
    setSpeedRunning(true);
    setShowSpeedTimer(true);
  };

  const handleSpeedDone = () => {
    setSpeedRunning(false);
    setShowSpeedTimer(false);
    setShowSpeedResult(true);
  };

  const handleSubmitSpeed = async () => {
    if (!user?.id || !speedTarget) return;
    setSubmittingSpeed(true);
    try {
      const today = getLocalDate();
      await supabase.from('daily_sessions').insert({
        user_id: user.id,
        touches_logged: speedTarget,
        duration_minutes: Math.max(1, Math.ceil(speedElapsed / 60)),
        is_timed_challenge: true,
        challenge_duration_seconds: speedElapsed,
        challenge_type: `speed_${speedTarget}`,
        training_focus: 'dribbling',
        is_game_speed: true,
        date: today,
      });
      queryClient.invalidateQueries({ queryKey: ['speed-pb', user.id] });
      handleSessionLogged();
      setCelebrationTouches(speedTarget);
      setShowSpeedResult(false);
      setSpeedElapsed(0);
      setShowVinnieCelebration(true);
    } catch {
      Alert.alert('Error', 'Failed to log session. Please try again.');
    } finally {
      setSubmittingSpeed(false);
    }
  };

  useEffect(() => {
    if (timerRunning) {
      // Compute absolute end time from current remaining — survives phone sleep
      endTimeRef.current = Date.now() + pausedRemainingRef.current * 1000;
      whistlePlayedRef.current = false;

      // Schedule an OS-level notification so the alarm fires even if phone sleeps
      Notifications.scheduleNotificationAsync({
        content: {
          title: "Time's up! ⚽",
          body: 'Your training session is complete. Log your touches!',
          // No sound here — in-app replayAsync() handles it when the app is foregrounded.
          // The notification only fires if the phone sleeps mid-session (no in-app sound needed then).
          ...(Platform.OS === 'android' && { channelId: 'timer' }),
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: new Date(endTimeRef.current),
        },
      })
        .then((id) => {
          timerNotificationIdRef.current = id;
        })
        .catch(() => {});

      timerRef.current = setInterval(() => {
        const remaining = Math.round((endTimeRef.current - Date.now()) / 1000);
        if (remaining <= 0) {
          // Phone was awake — cancel the notification before it fires
          if (timerNotificationIdRef.current) {
            Notifications.cancelScheduledNotificationAsync(
              timerNotificationIdRef.current,
            ).catch(() => {});
            timerNotificationIdRef.current = null;
          }
          pausedRemainingRef.current = 0;
          setTimeRemaining(0);
          stopTimer();
          if (!whistlePlayedRef.current) {
            whistlePlayedRef.current = true;
            Vibration.vibrate([0, 500, 200, 500]);
            whistleSoundRef.current?.replayAsync();
          }
          setShowTimerModal(false);
          setTimerFocus(getTodayFocus().key);
          setShowScoreModal(true);
        } else {
          pausedRemainingRef.current = remaining;
          setTimeRemaining(remaining);
        }
      }, 500);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      // Cancel the scheduled notification when paused or stopped
      if (timerNotificationIdRef.current) {
        Notifications.cancelScheduledNotificationAsync(
          timerNotificationIdRef.current,
        ).catch(() => {});
        timerNotificationIdRef.current = null;
      }
    };
  }, [timerRunning, stopTimer]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSubmitScore = async () => {
    const score = parseInt(scoreInput);
    if (!score || score <= 0) {
      Alert.alert('Invalid Score', 'Please enter a valid number');
      return;
    }

    if (!user?.id) return;

    setSubmittingScore(true);

    try {
      const today = getLocalDate();
      const durationMinutes = Math.ceil(freeTimerDuration / 60);

      const { error } = await supabase.from('daily_sessions').insert({
        user_id: user.id,
        drill_id: timerChallengeDrillId ?? null,
        touches_logged: score,
        duration_minutes: durationMinutes,
        is_timed_challenge: true,
        challenge_duration_seconds: freeTimerDuration,
        training_focus: timerFocus,
        date: today,
      });

      if (error) throw error;

      // Fetch global rank for this duration (fire-and-forget style)
      getTimedRank(user.id, freeTimerDuration, score)
        .then((rank) => setTimedRank(rank))
        .catch(() => {});

      const wasChallenge = !!timerChallengeDrillId;
      setCelebrationTouches(score);
      setScoreInput('');
      setShowScoreModal(false);
      setFreeTimerDuration(0);
      setTimerChallengeDrillId(undefined);
      setTimerChallengeName(undefined);
      handleSessionLogged(wasChallenge);
      setShowVinnieCelebration(true);
    } catch (error) {
      console.error('Error logging session:', error);
      Alert.alert('Error', 'Failed to save your score. Please try again.');
    } finally {
      setSubmittingScore(false);
    }
  };

  const cancelTimer = () => {
    Alert.alert('Stop Timer?', 'Are you sure you want to stop the timer?', [
      { text: 'Keep Going', style: 'cancel' },
      {
        text: 'Stop',
        style: 'destructive',
        onPress: () => {
          stopTimer();
          setShowTimerModal(false);
          setTimeRemaining(0);
          setTimerChallengeDrillId(undefined);
          setTimerChallengeName(undefined);
        },
      },
    ]);
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size='large' color='#1f89ee' />
      </View>
    );
  }

  const todayTouches = touchStats?.today_touches || 0;
  const dailyTarget = touchStats?.daily_target || 1000;
  const progressPercent = Math.min((todayTouches / dailyTarget) * 100, 100);
  const sessionGoal = Math.max(Math.round((dailyTarget * 0.2) / 50) * 50, 200);

  const toggleDrill = (id: string) => {
    setCheckedDrills(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  return (
    <View style={styles.container}>
      <PageHeader
        title='Train'
        showAvatar={true}
        avatarUrl={profile?.avatar_url}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor='#1f89ee'
          />
        }
      >
        {/* WORKOUT CARD */}
        <View style={styles.workoutCard}>
          {/* Dark header */}
          <View style={styles.workoutHeader}>
            <View style={styles.workoutHeaderTop}>
              <TouchableOpacity
                style={styles.workoutHeaderMain}
                onPress={() => { setTimerPickerStep('focus'); setShowTimerPicker(true); }}
                activeOpacity={0.75}
              >
                <Text style={styles.workoutHeaderLabel}>{"TODAY'S WORKOUT"}</Text>
                <Text style={styles.workoutFocusTitle}>{todayFocus.displayLabel}</Text>
                <Text style={styles.workoutFocusDesc}>{todayFocus.description}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.workoutChevronBtn}
                onPress={() => setIsWorkoutExpanded(v => !v)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={isWorkoutExpanded ? 'chevron-up' : 'chevron-down'}
                  size={22}
                  color='#FFFFFF'
                />
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={styles.workoutTimerBadge}
              onPress={() => { setTimerPickerStep('focus'); setShowTimerPicker(true); }}
              activeOpacity={0.75}
            >
              <Ionicons name='timer-outline' size={13} color='rgba(255,255,255,0.7)' />
              <Text style={styles.workoutTimerText}>Start Timer</Text>
            </TouchableOpacity>
          </View>

          {/* White body */}
          {isWorkoutExpanded && <View style={styles.workoutBody}>
            {/* Goal */}
            <View style={styles.workoutGoalRow}>
              <Text style={styles.workoutGoalLabel}>Goal</Text>
              <Text style={styles.workoutGoalValue}>{sessionGoal.toLocaleString()} {todayFocus.displayLabel} touches</Text>
            </View>

            {/* Drill checklist */}
            {focusDrills.length > 0 && (
              <>
                <Text style={styles.workoutDrillsLabel}>Suggested Drills</Text>
                {focusDrills.map((drill, index) => {
                  const isChecked = checkedDrills.has(drill.id);
                  const isLast = index === focusDrills.length - 1;
                  return (
                    <TouchableOpacity
                      key={drill.id}
                      style={[styles.workoutDrillRow, !isLast && styles.workoutDrillDivider]}
                      onPress={() => toggleDrill(drill.id)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.workoutDrillLeft}>
                        <Ionicons
                          name={isChecked ? 'checkmark-circle' : 'ellipse-outline'}
                          size={22}
                          color={isChecked ? '#31af4d' : '#B0BEC5'}
                        />
                        <Text style={[styles.workoutDrillName, isChecked && styles.workoutDrillDone]}>
                          {drill.name}
                        </Text>
                      </View>
                      {drill.video_url && (
                        <TouchableOpacity
                          onPress={() => {
                            setDrillVideoUrl(drill.video_url!);
                            setDrillVideoName(drill.name);
                            setShowDrillVideo(true);
                          }}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <Ionicons name='play-circle-outline' size={20} color='#1f89ee' />
                        </TouchableOpacity>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </>
            )}
          </View>}
        </View>

        {/* Today's Progress */}
        <View style={styles.progressCard}>
          <View style={styles.progressSparkle}>
            <Text style={styles.sparkleEmoji}>✨</Text>
          </View>
          <Text style={styles.progressLabel}>{"Today's Progress"}</Text>
          <View style={styles.touchesRow}>
            <Text style={styles.touchesValue}>
              {todayTouches.toLocaleString()}
            </Text>
            <Text style={styles.touchesDivider}>/</Text>
            <Text style={styles.touchesTarget}>
              {dailyTarget.toLocaleString()}
            </Text>
          </View>
          <Text style={styles.touchesLabel}>touches</Text>
          <View style={styles.progressBarContainer}>
            <View
              style={[styles.progressBarFill, { width: `${progressPercent}%` }]}
            />
          </View>
          <Text style={styles.progressPercentText}>
            {Math.round(progressPercent)}% Complete
          </Text>
        </View>

        {/* Action Buttons Row */}
        <View style={styles.actionButtonsRow}>
          {/* Log Session Button */}
          <TouchableOpacity
            style={styles.logButton}
            onPress={() => setModalVisible(true)}
            activeOpacity={0.8}
          >
            <Ionicons name='add-circle' size={24} color='#FFF' />
            <Text style={styles.logButtonText}>LOG SESSION</Text>
          </TouchableOpacity>

          {/* Start Timer Button */}
          <TouchableOpacity
            style={styles.timerButton}
            onPress={() => { setTimerPickerStep('focus'); setShowTimerPicker(true); }}
            activeOpacity={0.8}
          >
            <Ionicons name='timer' size={24} color='#FFF' />
            <Text style={styles.timerButtonText}>START TIMER</Text>
          </TouchableOpacity>
        </View>


        {/* SPEED CHALLENGE */}
        <View style={styles.speedCard}>
          <View style={styles.speedCardHeader}>
            <Text style={styles.speedCardLabel}>Speed Challenge</Text>
            <Text style={styles.speedCardBadge}>KEEP MOVING</Text>
          </View>
          <Text style={styles.speedCardDesc}>
            How fast can you complete the touches? You must be dribbling and moving — no standing still.
          </Text>
          <View style={styles.speedOptions}>
            {([100, 200] as const).map((target) => {
              const pb = target === 100 ? pb100 : pb200;
              return (
                <TouchableOpacity
                  key={target}
                  style={styles.speedOption}
                  onPress={() => startSpeedChallenge(target)}
                  activeOpacity={0.75}
                >
                  <Text style={styles.speedOptionNumber}>{target}</Text>
                  <Text style={styles.speedOptionLabel}>touches</Text>
                  {pb !== null && (
                    <Text style={styles.speedOptionPb}>PB {formatTime(pb)}</Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* BROWSE TRAINING CATEGORIES */}
        <View style={styles.categoriesCard}>
          <Text style={styles.categoriesLabel}>Browse Training Categories</Text>
          <View style={styles.categoriesGrid}>
            {TRAINING_FOCUS_CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat.key}
                style={[
                  styles.categoryChip,
                  cat.key === todayFocus.key && styles.categoryChipActive,
                ]}
                onPress={() => router.push(`/(modals)/category-drills?focus=${cat.key}` as never)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.categoryChipText,
                    cat.key === todayFocus.key && styles.categoryChipTextActive,
                  ]}
                >
                  {cat.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>


      </ScrollView>

      {/* Timer Modal */}
      <Modal
        visible={showTimerModal}
        animationType='fade'
        transparent={false}
        statusBarTranslucent={Platform.OS === 'android'}
        hardwareAccelerated
        onRequestClose={cancelTimer}
      >
        <View style={styles.timerModal}>
          <View style={styles.timerContent}>
            <Text style={styles.timerChallengeName}>{timerChallengeName ?? 'Free Practice'}</Text>
            <Text style={styles.timerInstructions}>
              {timerChallengeName ? `Timer for: ${timerChallengeName}` : 'Get as many touches as you can!'}
            </Text>

            <View style={styles.timerCircle}>
              <Text style={styles.timerText}>{formatTime(timeRemaining)}</Text>
              <Text style={styles.timerSubtext}>
                {timerRunning ? 'remaining' : 'paused'}
              </Text>
            </View>

            <View style={styles.timerControlButtons}>
              <TouchableOpacity
                style={styles.timerSecondaryButton}
                onPress={resetTimer}
              >
                <Ionicons
                  name='refresh'
                  size={20}
                  color='rgba(255,255,255,0.8)'
                />
                <Text style={styles.timerSecondaryText}>Reset</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.timerStartPauseButton}
                onPress={pauseResumeTimer}
              >
                <Ionicons
                  name={timerRunning ? 'pause' : 'play'}
                  size={30}
                  color='#1f89ee'
                />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.timerSecondaryButton}
                onPress={cancelTimer}
              >
                <Ionicons name='stop' size={20} color='rgba(255,255,255,0.8)' />
                <Text style={styles.timerSecondaryText}>Stop</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Score Entry Modal */}
      <Modal
        visible={showScoreModal}
        animationType='slide'
        transparent={true}
        statusBarTranslucent={Platform.OS === 'android'}
        hardwareAccelerated
        onRequestClose={() => setShowScoreModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <View style={styles.scoreModalOverlay}>
            <View style={styles.scoreModalContent}>
              <View style={styles.scoreModalHeader}>
                <Text style={styles.scoreModalEmoji}>🎉</Text>
                <Text style={styles.scoreModalTitle}>Time&apos;s Up!</Text>
                {timerChallengeName && (
                  <View style={styles.scoreChallengeBanner}>
                    <Text style={styles.scoreChallengeBannerText}>Challenge: {timerChallengeName}</Text>
                  </View>
                )}
                <Text style={styles.scoreModalSubtitle}>
                  How many touches did you get?
                </Text>
              </View>

              <View style={styles.scoreInputContainer}>
                <TextInput
                  style={styles.scoreInput}
                  placeholder='Enter your score'
                  placeholderTextColor='#B0BEC5'
                  keyboardType='number-pad'
                  value={scoreInput}
                  onChangeText={setScoreInput}
                  autoFocus={true}
                />
              </View>

              <View style={styles.scoreModalButtons}>
                <TouchableOpacity
                  style={styles.skipButton}
                  onPress={() => {
                    setShowScoreModal(false);
                    setScoreInput('');
                    setTimerChallengeDrillId(undefined);
                    setTimerChallengeName(undefined);
                  }}
                >
                  <Text style={styles.skipButtonText}>Skip</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.saveScoreButton,
                    (!scoreInput || submittingScore) &&
                      styles.saveScoreButtonDisabled,
                  ]}
                  onPress={handleSubmitScore}
                  disabled={!scoreInput || submittingScore}
                >
                  {submittingScore ? (
                    <ActivityIndicator size='small' color='#FFF' />
                  ) : (
                    <Text style={styles.saveScoreButtonText}>Save Score</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Timer Picker Modal */}
      <Modal
        visible={showTimerPicker}
        animationType='slide'
        transparent={true}
        statusBarTranslucent={Platform.OS === 'android'}
        hardwareAccelerated
        onRequestClose={() => setShowTimerPicker(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <View style={styles.timerPickerOverlay}>
            <View style={styles.timerPickerContent}>

              {timerPickerStep === 'focus' ? (
                <>
                  <View style={styles.timerPickerHeader}>
                    <Text style={styles.timerPickerTitle}>What are you working on?</Text>
                    <Text style={styles.timerPickerSubtitle}>Pick a focus for this session</Text>
                  </View>

                  <View style={styles.scoreFocusGrid}>
                    {TRAINING_FOCUS_CATEGORIES.map((cat) => (
                      <TouchableOpacity
                        key={cat.key}
                        style={[styles.scoreFocusChip, timerFocus === cat.key && styles.scoreFocusChipActive]}
                        onPress={() => {
                          setTimerFocus(cat.key);
                          if (cat.key === 'free_play' && todayChallenge) {
                            setTimerChallengeDrillId(todayChallenge.id);
                            setTimerChallengeName(todayChallenge.name);
                          } else {
                            setTimerChallengeDrillId(undefined);
                            setTimerChallengeName(undefined);
                          }
                          setTimerPickerStep('duration');
                        }}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.scoreFocusChipText, timerFocus === cat.key && styles.scoreFocusChipTextActive]}>
                          {cat.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <TouchableOpacity
                    style={styles.timerPickerCancel}
                    onPress={() => {
                      setShowTimerPicker(false);
                      setTimerChallengeDrillId(undefined);
                      setTimerChallengeName(undefined);
                    }}
                  >
                    <Text style={styles.timerPickerCancelText}>Cancel</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <View style={styles.timerPickerHeader}>
                    <Text style={styles.timerPickerEmoji}>⏱️</Text>
                    <Text style={styles.timerPickerTitle}>How long?</Text>
                    <Text style={styles.timerPickerSubtitle}>
                      {TRAINING_FOCUS_CATEGORIES.find((c) => c.key === timerFocus)?.label ?? 'Free Play'}
                    </Text>
                  </View>

                  <View style={styles.timerOptionsGrid}>
                    {TIMER_OPTIONS.map((option) => {
                      const locked = !isPremium && !FREE_TIMER_SECONDS.has(option.seconds);
                      return (
                        <TouchableOpacity
                          key={option.seconds}
                          style={[styles.timerOption, locked && styles.timerOptionLocked]}
                          onPress={() => {
                            if (locked) {
                              router.push('/(modals)/paywall');
                              return;
                            }
                            startFreeTimer(option.seconds);
                          }}
                        >
                          {locked && (
                            <Ionicons name='lock-closed' size={12} color='rgba(255,255,255,0.7)' style={{ marginBottom: 2 }} />
                          )}
                          <Text style={styles.timerOptionText}>{option.label}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  <View style={[styles.customTimerSection, !isPremium && styles.customTimerSectionLocked]}>
                    <View style={styles.customTimerLabelRow}>
                      <Text style={styles.customTimerLabel}>Custom duration</Text>
                      {!isPremium && (
                        <TouchableOpacity onPress={() => router.push('/(modals)/paywall')} style={styles.proLockBadge}>
                          <Ionicons name='lock-closed' size={12} color='#78909C' />
                          <Text style={styles.proLockText}>Pro</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                    <View style={styles.customTimerRow}>
                      <View style={styles.customTimerInputGroup}>
                        <TextInput
                          style={styles.customTimerInput}
                          placeholder='0'
                          placeholderTextColor='#B0BEC5'
                          keyboardType='number-pad'
                          value={customMinutes}
                          onChangeText={setCustomMinutes}
                          editable={isPremium}
                        />
                        <Text style={styles.customTimerUnit}>min</Text>
                      </View>
                      <Text style={styles.customTimerSeparator}>:</Text>
                      <View style={styles.customTimerInputGroup}>
                        <TextInput
                          style={styles.customTimerInput}
                          placeholder='0'
                          placeholderTextColor='#B0BEC5'
                          keyboardType='number-pad'
                          value={customSeconds}
                          onChangeText={(v) => {
                            const n = parseInt(v);
                            if (!v || (n >= 0 && n < 60)) setCustomSeconds(v);
                          }}
                          editable={isPremium}
                        />
                        <Text style={styles.customTimerUnit}>sec</Text>
                      </View>
                      <TouchableOpacity
                        style={[
                          styles.customTimerButton,
                          (!customMinutes && !customSeconds) && styles.customTimerButtonDisabled,
                          !isPremium && styles.customTimerButtonDisabled,
                        ]}
                        onPress={() => {
                          if (!isPremium) {
                            router.push('/(modals)/paywall');
                            return;
                          }
                          const mins = parseInt(customMinutes) || 0;
                          const secs = parseInt(customSeconds) || 0;
                          const total = mins * 60 + secs;
                          if (total > 0) {
                            startFreeTimer(total);
                            setCustomMinutes('');
                            setCustomSeconds('');
                          }
                        }}
                        disabled={!isPremium && !customMinutes && !customSeconds}
                      >
                        <Text style={styles.customTimerButtonText}>Go</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={styles.timerPickerCancel}
                    onPress={() => setTimerPickerStep('focus')}
                  >
                    <Text style={styles.timerPickerCancelText}>Back</Text>
                  </TouchableOpacity>
                </>
              )}

            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Vinnie Celebration */}
      <VinnieCelebrationModal
        visible={showVinnieCelebration}
        touchCount={celebrationTouches}
        rankMessage={timedRank !== null ? `#${timedRank} globally this week` : undefined}
        onClose={() => {
          setShowVinnieCelebration(false);
          setTimedRank(null);
          if (earnedBadges.length) setShowBadgeModal(true);
          else if (earnedTeamBadgeIds.length) setShowTeamBadgeModal(true);
        }}
      />

      {/* Individual Badge Earned */}
      <BadgeEarnedModal
        visible={showBadgeModal}
        badges={allBadges.filter((b) => earnedBadges.includes(b.id))}
        onClose={() => {
          setShowBadgeModal(false);
          setEarnedBadges([]);
          if (earnedTeamBadgeIds.length) setShowTeamBadgeModal(true);
        }}
      />

      {/* Team Badge Earned */}
      <TeamBadgeEarnedModal
        visible={showTeamBadgeModal}
        badges={earnedTeamBadgeIds.length > 0 ? [getCurrentWeekChallenge()] : []}
        onClose={() => {
          setShowTeamBadgeModal(false);
          setEarnedTeamBadgeIds([]);
        }}
      />

      {/* Log Session Modal */}
      {user?.id && (
        <LogSessionModal
          visible={modalVisible}
          onClose={() => setModalVisible(false)}
          userId={user.id}
          onSuccess={handleSessionLogged}
          teamId={profile?.team_id ?? null}
          badgeContext={{
            totalSessions: touchStats?.total_sessions ?? 0,
            totalTouches: touchStats?.total_touches ?? 0,
            currentStreak: touchStats?.current_streak ?? 0,
            previousJugglePB: jugglePB,
            sessionsThisWeek: touchStats?.this_week_sessions ?? 0,
            teamId: profile?.team_id ?? null,
          }}
          onSessionLogged={(tc, isChallenge, drillName, earnedBadgeIds, earnedTeamIds) => {
            setCelebrationTouches(tc);
            setShowVinnieCelebration(true);
            if (earnedBadgeIds?.length) setEarnedBadges(earnedBadgeIds);
            if (earnedTeamIds?.length) setEarnedTeamBadgeIds(earnedTeamIds);
          }}
        />
      )}

      {/* Drill Video Modal — for suggested drills */}
      <DrillVideoModal
        visible={showDrillVideo}
        onClose={() => setShowDrillVideo(false)}
        videoUrl={drillVideoUrl}
        drillName={drillVideoName}
      />

      {/* Speed Challenge Timer */}
      <Modal
        visible={showSpeedTimer}
        animationType='slide'
        statusBarTranslucent={Platform.OS === 'android'}
        hardwareAccelerated
        onRequestClose={() => {
          setSpeedRunning(false);
          setShowSpeedTimer(false);
          setSpeedElapsed(0);
        }}
      >
        <View style={styles.speedTimerModal}>
          <Text style={styles.speedTimerTarget}>{speedTarget} TOUCHES</Text>
          <Text style={styles.speedTimerReminder}>Keep moving — dribble the whole time!</Text>
          <View style={styles.speedTimerCircle}>
            <Text style={styles.speedTimerTime}>{formatTime(speedElapsed)}</Text>
            <Text style={styles.speedTimerSubtext}>elapsed</Text>
          </View>
          <Text style={styles.speedTimerInstruction}>Tap DONE when you hit {speedTarget}</Text>
          <TouchableOpacity style={styles.speedDoneButton} onPress={handleSpeedDone} activeOpacity={0.85}>
            <Text style={styles.speedDoneText}>DONE</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.speedTimerCancel}
            onPress={() => {
              setSpeedRunning(false);
              setShowSpeedTimer(false);
              setSpeedElapsed(0);
            }}
          >
            <Text style={styles.speedTimerCancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* Speed Challenge Result */}
      <Modal
        visible={showSpeedResult}
        animationType='fade'
        transparent
        onRequestClose={() => { setShowSpeedResult(false); setSpeedElapsed(0); }}
      >
        <View style={styles.speedResultOverlay}>
          <View style={styles.speedResultCard}>
            <Text style={styles.speedResultEmoji}>🔥</Text>
            <Text style={styles.speedResultTime}>{formatTime(speedElapsed)}</Text>
            <Text style={styles.speedResultLabel}>{speedTarget} touches</Text>
            {(() => {
              const pb = speedTarget === 100 ? pb100 : pb200;
              if (pb === null || speedElapsed <= pb) {
                return <Text style={styles.speedResultNewPb}>New Personal Best!</Text>;
              }
              return <Text style={styles.speedResultPb}>PB: {formatTime(pb)}</Text>;
            })()}
            <TouchableOpacity
              style={styles.speedSubmitButton}
              onPress={handleSubmitSpeed}
              disabled={submittingSpeed}
            >
              {submittingSpeed
                ? <ActivityIndicator size='small' color='#FFF' />
                : <Text style={styles.speedSubmitText}>Save Result</Text>}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.speedDiscardButton}
              onPress={() => { setShowSpeedResult(false); setSpeedElapsed(0); }}
            >
              <Text style={styles.speedDiscardText}>Discard</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </View>
  );
};

export default TrainPage;

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    padding: 20,
  },

  // PROGRESS CARD
  progressCard: {
    backgroundColor: '#1f89ee',
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderRadius: 24,
    marginBottom: 16,
    shadowColor: '#1f89ee',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
    position: 'relative',
  },
  progressSparkle: {
    position: 'absolute',
    top: 16,
    right: 16,
  },
  sparkleEmoji: {
    fontSize: 22,
  },
  progressLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.75)',
    marginBottom: 8,
  },
  touchesRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 2,
  },
  touchesValue: {
    fontSize: 36,
    fontWeight: '900',
    color: '#FFF',
    lineHeight: 40,
  },
  touchesDivider: {
    fontSize: 24,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.5)',
    marginHorizontal: 6,
  },
  touchesTarget: {
    fontSize: 22,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.7)',
  },
  touchesLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 12,
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#FFD54F',
    borderRadius: 6,
  },
  progressPercentText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFD54F',
    textAlign: 'center',
  },

  // ACTION BUTTONS ROW
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  logButton: {
    flex: 1,
    backgroundColor: '#1f89ee',
    borderRadius: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#1f89ee',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  logButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  timerButton: {
    flex: 1,
    backgroundColor: '#ffb724',
    borderRadius: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#ffb724',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  timerButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.5,
  },

  // DRILL LIBRARY TILE
  libraryCard: {
    backgroundColor: '#FFF',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  libraryIconBg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E8F4FD',
    justifyContent: 'center',
    alignItems: 'center',
  },
  libraryTextBlock: {
    flex: 1,
  },
  libraryTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1a1a2e',
  },
  librarySubtitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#78909C',
    marginTop: 2,
  },

  // TIMER MODAL
  timerModal: {
    flex: 1,
    backgroundColor: '#1f89ee',
    justifyContent: 'center',
    alignItems: 'center',
  },
  timerContent: {
    alignItems: 'center',
    padding: 40,
  },
  timerChallengeName: {
    fontSize: 24,
    fontWeight: '900',
    color: '#FFF',
    textAlign: 'center',
    marginBottom: 8,
  },
  timerInstructions: {
    fontSize: 18,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 40,
  },
  timerCircle: {
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
    borderWidth: 6,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  timerText: {
    fontSize: 64,
    fontWeight: '900',
    color: '#FFF',
  },
  timerSubtext: {
    fontSize: 18,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 8,
  },
  timerControlButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
  },
  timerStartPauseButton: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  timerSecondaryButton: {
    alignItems: 'center',
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  timerSecondaryText: {
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.7)',
  },

  // SCORE MODAL
  scoreModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  scoreModalContent: {
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: 28,
    width: '100%',
    maxWidth: 340,
  },
  scoreModalHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  scoreModalEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  scoreModalTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#1a1a2e',
    marginBottom: 8,
  },
  scoreModalSubtitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#78909C',
    textAlign: 'center',
  },
  scoreChallengeBanner: {
    backgroundColor: '#E8F5E9',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginTop: 8,
    marginBottom: 4,
    borderLeftWidth: 3,
    borderLeftColor: '#31af4d',
    alignSelf: 'stretch',
  },
  scoreChallengeBannerText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#388E3C',
  },
  scoreInputContainer: {
    marginBottom: 24,
  },
  scoreInput: {
    backgroundColor: '#F5F7FA',
    borderRadius: 16,
    padding: 18,
    fontSize: 24,
    fontWeight: '800',
    color: '#1a1a2e',
    textAlign: 'center',
    borderWidth: 2,
    borderColor: '#E0E0E0',
  },
  scoreModalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  skipButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 14,
    backgroundColor: '#F5F7FA',
    alignItems: 'center',
  },
  skipButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#78909C',
  },
  saveScoreButton: {
    flex: 2,
    paddingVertical: 16,
    borderRadius: 14,
    backgroundColor: '#4CAF50',
    alignItems: 'center',
  },
  saveScoreButtonDisabled: {
    backgroundColor: '#B0BEC5',
  },
  saveScoreButtonText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FFF',
  },

  // TIMER PICKER MODAL
  timerPickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  timerPickerContent: {
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: 28,
    width: '100%',
    maxWidth: 340,
  },
  timerPickerHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  timerPickerEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  timerPickerTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#1a1a2e',
    marginBottom: 8,
  },
  timerPickerSubtitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#78909C',
    textAlign: 'center',
  },
  timerOptionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  timerOption: {
    width: '30%',
    backgroundColor: '#4CAF50',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  timerOptionText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFF',
  },
  customTimerSection: {
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 20,
    marginBottom: 16,
  },
  timerOptionLocked: {
    backgroundColor: '#B0BEC5',
    shadowColor: '#B0BEC5',
  },
  customTimerSectionLocked: {
    opacity: 0.6,
  },
  customTimerLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  proLockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F5F7FA',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  proLockText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#78909C',
  },
  customTimerLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#78909C',
  },
  customTimerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  customTimerInputGroup: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  customTimerInput: {
    width: '100%',
    backgroundColor: '#F5F7FA',
    borderRadius: 12,
    padding: 14,
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a2e',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    textAlign: 'center',
  },
  customTimerUnit: {
    fontSize: 12,
    fontWeight: '700',
    color: '#78909C',
  },
  customTimerSeparator: {
    fontSize: 22,
    fontWeight: '900',
    color: '#1a1a2e',
    marginTop: 14,
    marginBottom: 18,
  },
  customTimerButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 28,
    paddingVertical: 16,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  customTimerButtonDisabled: {
    backgroundColor: '#B0BEC5',
  },
  customTimerButtonText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFF',
  },
  timerPickerCancel: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  timerPickerCancelText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#78909C',
  },

  // WORKOUT CARD
  workoutCard: {
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
  },
  workoutHeader: {
    backgroundColor: '#1a1a2e',
    padding: 18,
  },
  workoutHeaderTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  workoutHeaderMain: {
    flex: 1,
  },
  workoutHeaderLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  workoutChevronBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  workoutTimerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginTop: 12,
  },
  workoutTimerText: {
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.7)',
  },
  workoutFocusTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  workoutFocusDesc: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.6)',
  },
  workoutBody: {
    backgroundColor: '#FFFFFF',
    padding: 16,
  },
  workoutGoalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F4F8',
    marginBottom: 14,
  },
  workoutGoalLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#78909C',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  workoutGoalValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1a1a2e',
  },
  workoutDrillsLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#78909C',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  workoutDrillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  workoutDrillDivider: {
    borderBottomWidth: 1,
    borderBottomColor: '#F0F4F8',
  },
  workoutDrillLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  workoutDrillName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1a1a2e',
    flex: 1,
  },
  workoutDrillDone: {
    textDecorationLine: 'line-through',
    color: '#B0BEC5',
  },

  // BROWSE CATEGORIES
  categoriesCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  categoriesLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1a1a2e',
    marginBottom: 12,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryChip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: '#F0F2F5',
    borderWidth: 2,
    borderColor: '#DDE1E7',
  },
  categoryChipActive: {
    backgroundColor: '#1a1a2e',
    borderColor: '#1a1a2e',
  },
  categoryChipText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#78909C',
  },
  categoryChipTextActive: {
    color: '#FFFFFF',
  },

  // DRILL LIST — no-video state
  suggestedWatchLinkMuted: {
    fontSize: 13,
    fontWeight: '600',
    color: '#B0BEC5',
  },

  // SCORE MODAL — FOCUS PICKER
  scoreFocusSection: {
    marginBottom: 20,
  },
  scoreFocusLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#78909C',
    marginBottom: 10,
  },
  scoreFocusGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  scoreFocusChip: {
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: '#F0F2F5',
    borderWidth: 2,
    borderColor: '#DDE1E7',
  },
  scoreFocusChipActive: {
    backgroundColor: '#E8F4FF',
    borderColor: '#1f89ee',
  },
  scoreFocusChipText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#78909C',
  },
  scoreFocusChipTextActive: {
    color: '#1f89ee',
  },

  // SPEED CHALLENGE CARD
  speedCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E8F0FE',
  },
  speedCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  speedCardLabel: {
    fontSize: 16,
    fontWeight: '900',
    color: '#1a1a2e',
  },
  speedCardBadge: {
    fontSize: 10,
    fontWeight: '800',
    color: '#ffb724',
    letterSpacing: 0.5,
    backgroundColor: '#FFF8E7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  speedCardDesc: {
    fontSize: 13,
    fontWeight: '600',
    color: '#78909C',
    lineHeight: 19,
    marginBottom: 16,
  },
  speedOptions: {
    flexDirection: 'row',
    gap: 10,
  },
  speedOption: {
    flex: 1,
    backgroundColor: '#EFF6FF',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  speedOptionNumber: {
    fontSize: 32,
    fontWeight: '900',
    color: '#1f89ee',
    lineHeight: 36,
  },
  speedOptionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#78909C',
    marginTop: 2,
  },
  speedOptionPb: {
    fontSize: 11,
    fontWeight: '700',
    color: '#31af4d',
    marginTop: 6,
  },

  // SPEED TIMER MODAL
  speedTimerModal: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  speedTimerTarget: {
    fontSize: 28,
    fontWeight: '900',
    color: '#ffb724',
    letterSpacing: 1,
    marginBottom: 8,
  },
  speedTimerReminder: {
    fontSize: 16,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    marginBottom: 48,
  },
  speedTimerCircle: {
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 6,
    borderColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
  },
  speedTimerTime: {
    fontSize: 64,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  speedTimerSubtext: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.5)',
    marginTop: 4,
  },
  speedTimerInstruction: {
    fontSize: 15,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.5)',
    marginBottom: 32,
    textAlign: 'center',
  },
  speedDoneButton: {
    backgroundColor: '#31af4d',
    borderRadius: 20,
    paddingVertical: 20,
    paddingHorizontal: 64,
    shadowColor: '#31af4d',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
    marginBottom: 16,
  },
  speedDoneText: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFF',
    letterSpacing: 1,
  },
  speedTimerCancel: {
    paddingVertical: 12,
  },
  speedTimerCancelText: {
    fontSize: 15,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.4)',
  },

  // SPEED RESULT MODAL
  speedResultOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  speedResultCard: {
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: 32,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
  },
  speedResultEmoji: {
    fontSize: 52,
    marginBottom: 12,
  },
  speedResultTime: {
    fontSize: 56,
    fontWeight: '900',
    color: '#1a1a2e',
    marginBottom: 4,
  },
  speedResultLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#78909C',
    marginBottom: 16,
  },
  speedResultNewPb: {
    fontSize: 15,
    fontWeight: '800',
    color: '#31af4d',
    marginBottom: 24,
  },
  speedResultPb: {
    fontSize: 14,
    fontWeight: '700',
    color: '#78909C',
    marginBottom: 24,
  },
  speedSubmitButton: {
    backgroundColor: '#31af4d',
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 40,
    width: '100%',
    alignItems: 'center',
    marginBottom: 10,
  },
  speedSubmitText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FFF',
  },
  speedDiscardButton: {
    paddingVertical: 10,
  },
  speedDiscardText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#B0BEC5',
  },
});
