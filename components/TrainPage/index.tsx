import CameraTimerScreen from '@/components/TrainPage/CameraTimerScreen';
import PageHeader from '@/components/common/PageHeader';
import DrillVideoModal from '@/components/modals/DrillVideoModal';
import LogSessionModal from '@/components/modals/LogSessionModal';
import VinnieCelebrationModal from '@/components/modals/VinnieCelebrationModal';
import { useProfile } from '@/hooks/useProfile';
import { usePremium } from '@/hooks/usePremium';
import { useDrills, useTouchTracking } from '@/hooks/useTouchTracking';
import { useUser } from '@/hooks/useUser';
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
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  Vibration,
  View,
} from 'react-native';

const BESWICK_QUOTES = [
  'Champions train when nobody is watching.',
  'You either train to dominate or you train to lose.',
  'The difference between winners and losers is attitude, not ability.',
  'Turn up, train to win, or train to dominate — the choice defines you.',
  'Be a fighter. Never a victim.',
  "How much do you want it? That's the only question that matters.",
  "Elite players don't wait to be motivated. They create it.",
  'Consistency over intensity. Show up every day.',
  'Your habits today are your results tomorrow.',
  'Suffering in training means winning in competition.',
  'Identity drives behaviour. Decide who you are, then act accordingly.',
  'The mental game is won in training, not on match day.',
];

const getDailyBeswickQuote = () => {
  const today = new Date();
  const dayOfYear = Math.floor(
    (today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) /
      (1000 * 60 * 60 * 24),
  );
  return BESWICK_QUOTES[dayOfYear % BESWICK_QUOTES.length];
};

// Pro tips - mix of quotes and practical training advice
const PRO_TIPS = [
  // Inspirational quotes
  {
    text: 'The ball is like a magnet. If you can control it, you can do anything.',
    author: 'Ronaldinho',
  },
  {
    text: "I always tell young players to work on your technique. That's the foundation.",
    author: 'Xavi Hernández',
  },
  {
    text: 'You have to fight to reach your dream. Sacrifice and work hard for it.',
    author: 'Lionel Messi',
  },
  {
    text: 'Every training session is an opportunity to improve. Never waste one.',
    author: 'Pep Guardiola',
  },
  {
    text: 'Ball control is everything. The best players touch the ball 10,000 times a day.',
    author: 'Wiel Coerver',
  },
  {
    text: 'Work on your weaknesses until they become your strengths.',
    author: 'Johan Cruyff',
  },
  {
    text: 'The secret is to believe in your dreams. They can come true.',
    author: 'Cristiano Ronaldo',
  },

  // Practical tips - Ball Control
  {
    text: 'Keep the ball close to your feet. The tighter your control, the harder you are to dispossess.',
    author: 'Training Tip',
  },
  {
    text: 'Use all surfaces of your foot - inside, outside, sole, and laces. Versatility is key.',
    author: 'Training Tip',
  },
  {
    text: 'Practice with your weaker foot as much as your strong foot. Two-footed players are unstoppable.',
    author: 'Training Tip',
  },
  {
    text: 'Keep your knees slightly bent and stay on your toes. Good balance means better control.',
    author: 'Training Tip',
  },

  // Practical tips - First Touch
  {
    text: 'Cushion the ball on your first touch. A soft touch keeps the ball close and ready.',
    author: 'Training Tip',
  },
  {
    text: 'Always know where you want to go before the ball arrives. Look up, then receive.',
    author: 'Training Tip',
  },
  {
    text: 'Practice receiving the ball while turning. It saves time and beats defenders.',
    author: 'Training Tip',
  },

  // Practical tips - Dribbling
  {
    text: 'Keep your head up while dribbling. The ball should be felt, not watched.',
    author: 'Training Tip',
  },
  {
    text: 'Change pace and direction suddenly. Unpredictability is your greatest weapon.',
    author: 'Training Tip',
  },
  {
    text: 'Use your body to shield the ball. Get between the defender and the ball.',
    author: 'Training Tip',
  },

  // Practical tips - Training Habits
  {
    text: 'Quality over quantity. 100 focused touches beat 500 sloppy ones.',
    author: 'Training Tip',
  },
  {
    text: 'Train in short bursts throughout the day. Consistency beats intensity.',
    author: 'Training Tip',
  },
  {
    text: 'Practice under pressure. Add time limits or challenges to simulate game situations.',
    author: 'Training Tip',
  },
  {
    text: 'Record yourself training. Watching your technique helps you spot mistakes.',
    author: 'Training Tip',
  },

  // Game Speed Training
  {
    text: "Train faster than you play. If you can do it fast in training, it'll be easy in a game.",
    author: 'Training Tip',
  },
  {
    text: 'Perfect practice at slow speed is useless. The game is fast - your training should be too.',
    author: 'Training Tip',
  },
  {
    text: "Mistakes at speed are better than perfection at a snail's pace. Learn from errors, keep pushing.",
    author: 'Training Tip',
  },
  {
    text: "Aim for 50+ touches per minute. That's game speed. Anything less is warm-up.",
    author: 'Training Tip',
  },
  {
    text: "Speed is a skill. The more you practice fast, the more comfortable you'll be under pressure.",
    author: 'Training Tip',
  },
  {
    text: 'In a game, you have 1-2 seconds on the ball. Train like you have even less.',
    author: 'Training Tip',
  },
];

const DIFFICULTY_COLORS: Record<string, { bg: string; text: string }> = {
  beginner: { bg: '#E8F5E9', text: '#388E3C' },
  intermediate: { bg: '#FFF3E0', text: '#F57C00' },
  advanced: { bg: '#FFEBEE', text: '#D32F2F' },
};

// Get 3 tips for today based on the date
const getTodaysTips = () => {
  const today = new Date();
  const dayOfYear = Math.floor(
    (today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) /
      (1000 * 60 * 60 * 24),
  );
  const startIndex = (dayOfYear * 3) % PRO_TIPS.length;
  return [
    PRO_TIPS[startIndex % PRO_TIPS.length],
    PRO_TIPS[(startIndex + 1) % PRO_TIPS.length],
    PRO_TIPS[(startIndex + 2) % PRO_TIPS.length],
  ];
};

const FREE_TIMER_SECONDS = new Set([60, 300]); // 1 min + 5 min

const TrainPage = () => {
  const { data: user } = useUser();
  const { data: profile } = useProfile(user?.id);
  const { isPremium } = usePremium();
  const router = useRouter();
  const [modalVisible, setModalVisible] = useState(false);

  const todaysTips = getTodaysTips();

  // Timer state
  const [showTimerModal, setShowTimerModal] = useState(false);
  const [timerRunning, setTimerRunning] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [showScoreModal, setShowScoreModal] = useState(false);
  const [scoreInput, setScoreInput] = useState('');
  const [submittingScore, setSubmittingScore] = useState(false);
  const [freeTimerDuration, setFreeTimerDuration] = useState(0);
  const [showTimerPicker, setShowTimerPicker] = useState(false);
  const [challengeDrillId, setChallengeDrillId] = useState<
    string | undefined
  >();
  const [challengeName, setChallengeName] = useState<string | undefined>();
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoName, setVideoName] = useState<string>('');
  const [videoDescription, setVideoDescription] = useState<string>('');
  const [showVinnieCelebration, setShowVinnieCelebration] = useState(false);
  const [celebrationTouches, setCelebrationTouches] = useState(0);
  const [customMinutes, setCustomMinutes] = useState('');
  const [customSeconds, setCustomSeconds] = useState('');
  const [drillFilter, setDrillFilter] = useState<
    'all' | 'beginner' | 'intermediate' | 'advanced'
  >('beginner');
  const [cameraMode, setCameraMode] = useState(false);
  const [showCameraTimer, setShowCameraTimer] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const whistleSoundRef = useRef<Audio.Sound | null>(null);
  const endTimeRef = useRef<number>(0);
  const pausedRemainingRef = useRef<number>(0);
  const timerNotificationIdRef = useRef<string | null>(null);
  const whistlePlayedRef = useRef<boolean>(false);

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

  const { data: touchStats, isLoading, refetch } = useTouchTracking(user?.id);
  const { data: drills = [], refetch: refetchDrills } = useDrills();

  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetch(), refetchDrills()]);
    setRefreshing(false);
  }, [refetch, refetchDrills]);

  const handleSessionLogged = () => {
    refetch();
  };

  // Timer logic
  const startFreeTimer = useCallback(
    (seconds: number) => {
      setFreeTimerDuration(seconds);
      setTimeRemaining(seconds);
      pausedRemainingRef.current = seconds;
      setShowTimerPicker(false);
      if (cameraMode && Platform.OS !== 'web') {
        setShowCameraTimer(true);
      } else {
        setShowTimerModal(true);
      }
    },
    [cameraMode],
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
        drill_id: null,
        touches_logged: score,
        duration_minutes: durationMinutes,
        date: today,
      });

      if (error) throw error;

      setCelebrationTouches(score);
      setScoreInput('');
      setShowScoreModal(false);
      setFreeTimerDuration(0);
      handleSessionLogged();
      setShowVinnieCelebration(true);
    } catch (error) {
      console.error('Error logging session:', error);
      Alert.alert('Error', 'Failed to save your score. Please try again.');
    } finally {
      setSubmittingScore(false);
    }
  };

  const handleCameraTimerComplete = (count: number) => {
    setShowCameraTimer(false);
    setScoreInput(count > 0 ? String(count) : '');
    setShowScoreModal(true);
  };

  const handleCameraTimerCancel = () => {
    setShowCameraTimer(false);
    setTimeRemaining(0);
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

  const drillsByDifficulty = {
    beginner: drills.filter((d) => d.difficulty_level === 'beginner'),
    intermediate: drills.filter((d) => d.difficulty_level === 'intermediate'),
    advanced: drills.filter((d) => d.difficulty_level === 'advanced'),
  };

  const visibleLevels =
    drillFilter === 'all'
      ? (['beginner', 'intermediate', 'advanced'] as const)
      : ([drillFilter] as const);

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
        {/* Today's Progress */}
        <View style={styles.progressCard}>
          <View style={styles.progressSparkle}>
            <Text style={styles.sparkleEmoji}>✨</Text>
          </View>
          <Text style={styles.progressLabel}>TODAY&apos;S PROGRESS</Text>
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
            onPress={() => setShowTimerPicker(true)}
            activeOpacity={0.8}
          >
            <Ionicons name='timer' size={24} color='#FFF' />
            <Text style={styles.timerButtonText}>START TIMER</Text>
          </TouchableOpacity>
        </View>


        {/* Drill Library */}
        <View style={styles.libraryCard}>
          <View style={styles.libraryHeader}>
            <Text style={styles.libraryTitle}>Drill Library</Text>
          </View>

          {/* Level filter pills */}
          <View style={styles.drillFilterRow}>
            {(['beginner', 'intermediate', 'advanced', 'all'] as const).map(
              (level) => (
                <TouchableOpacity
                  key={level}
                  style={[
                    styles.drillFilterPill,
                    drillFilter === level && styles.drillFilterPillActive,
                    drillFilter === level &&
                      level !== 'all' && {
                        backgroundColor: DIFFICULTY_COLORS[level].bg,
                      },
                  ]}
                  onPress={() => setDrillFilter(level)}
                >
                  <Text
                    style={[
                      styles.drillFilterPillText,
                      drillFilter === level && styles.drillFilterPillTextActive,
                      drillFilter === level &&
                        level !== 'all' && {
                          color: DIFFICULTY_COLORS[level].text,
                        },
                    ]}
                  >
                    {level === 'all'
                      ? 'All'
                      : level.charAt(0).toUpperCase() + level.slice(1)}
                  </Text>
                </TouchableOpacity>
              ),
            )}
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
                          <Text style={styles.drillDescription}>
                            {drill.description}
                          </Text>
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
        </View>

        {/* Coach's Tips */}
        <View style={styles.tipsCard}>
          <View style={styles.tipsHeader}>
            <Text style={styles.tipsIcon}>💡</Text>
            <Text style={styles.tipsTitle}>Coach&apos;s Tips</Text>
          </View>
          <View style={styles.tipsList}>
            <View style={styles.tipItem}>
              <View style={styles.tipContent}>
                <Text style={styles.tipText}>&quot;{getDailyBeswickQuote()}&quot;</Text>
                <Text style={styles.tipAuthor}>— Bill Beswick, Sports Psychologist</Text>
              </View>
            </View>
            {todaysTips.map((tip, index) => (
              <View key={index} style={styles.tipItem}>
                <View style={styles.tipContent}>
                  <Text style={styles.tipText}>&quot;{tip.text}&quot;</Text>
                  <Text style={styles.tipAuthor}>— {tip.author}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Camera Timer Modal */}
      <Modal
        visible={showCameraTimer}
        animationType='fade'
        transparent={false}
        onRequestClose={handleCameraTimerCancel}
      >
        <CameraTimerScreen
          duration={freeTimerDuration}
          onComplete={handleCameraTimerComplete}
          onCancel={handleCameraTimerCancel}
          whistleSound={whistleSoundRef.current}
        />
      </Modal>

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
            <Text style={styles.timerChallengeName}>Free Practice</Text>
            <Text style={styles.timerInstructions}>
              Get as many touches as you can!
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
              <View style={styles.timerPickerHeader}>
                <Text style={styles.timerPickerEmoji}>⏱️</Text>
                <Text style={styles.timerPickerTitle}>Start Practice Timer</Text>
                <Text style={styles.timerPickerSubtitle}>
                  Choose a duration for your session
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

              {/* AI Camera Mode toggle — Pro only, native only */}
              {isPremium && Platform.OS !== 'web' && (
                <View style={styles.cameraModeRow}>
                  <View style={styles.cameraModeInfo}>
                    <Text style={styles.cameraModeTitle}>🤖 AI Count</Text>
                    <Text style={styles.cameraModeSubtitle}>
                      Camera auto-counts your touches
                    </Text>
                  </View>
                  <Switch
                    value={cameraMode}
                    onValueChange={setCameraMode}
                    trackColor={{ false: '#E5E7EB', true: '#1f89ee' }}
                    thumbColor='#FFF'
                  />
                </View>
              )}

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
                onPress={() => {
                  setShowTimerPicker(false);
                  setCustomMinutes('');
                  setCustomSeconds('');
                }}
              >
                <Text style={styles.timerPickerCancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Vinnie Celebration */}
      <VinnieCelebrationModal
        visible={showVinnieCelebration}
        touchCount={celebrationTouches}
        onClose={() => setShowVinnieCelebration(false)}
      />

      {/* Drill Video */}
      {videoUrl && (
        <DrillVideoModal
          visible={!!videoUrl}
          onClose={() => setVideoUrl(null)}
          videoUrl={videoUrl}
          drillName={videoName}
          description={videoDescription}
        />
      )}

      {/* Log Session Modal */}
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
          onSessionLogged={(tc) => {
            setCelebrationTouches(tc);
            setShowVinnieCelebration(true);
          }}
        />
      )}
    </View>
  );
};

export default TrainPage;

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F7FA',
  },
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  scrollContent: {
    padding: 20,
  },

  // PROGRESS CARD
  progressCard: {
    backgroundColor: '#1f89ee',
    paddingVertical: 28,
    paddingHorizontal: 24,
    borderRadius: 24,
    marginBottom: 20,
    shadowColor: '#1f89ee',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
    position: 'relative',
  },
  progressSparkle: {
    position: 'absolute',
    top: 20,
    right: 20,
  },
  sparkleEmoji: {
    fontSize: 28,
  },
  progressLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: 'rgba(255, 255, 255, 0.85)',
    marginBottom: 16,
    letterSpacing: 1.2,
  },
  touchesRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 4,
  },
  touchesValue: {
    fontSize: 54,
    fontWeight: '900',
    color: '#FFF',
    lineHeight: 54,
  },
  touchesDivider: {
    fontSize: 36,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.5)',
    marginHorizontal: 8,
  },
  touchesTarget: {
    fontSize: 32,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.7)',
  },
  touchesLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 20,
  },
  progressBarContainer: {
    height: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 12,
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
    marginBottom: 24,
  },
  logButton: {
    flex: 1,
    backgroundColor: '#ffb724',
    borderRadius: 16,
    paddingVertical: 18,
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
  logButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  timerButton: {
    flex: 1,
    backgroundColor: '#4CAF50',
    borderRadius: 16,
    paddingVertical: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#4CAF50',
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

  // DRILL LIBRARY
  libraryCard: {
    backgroundColor: '#FFF',
    padding: 20,
    borderRadius: 24,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  libraryHeader: {
    marginBottom: 12,
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
  libraryTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#1a1a2e',
    marginBottom: 2,
  },
  librarySubtitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#78909C',
  },
  difficultySection: {
    marginBottom: 16,
  },
  difficultyHeader: {
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
    backgroundColor: '#F5F7FA',
    borderRadius: 14,
    overflow: 'hidden',
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
  drillCardLocked: {
    opacity: 0.5,
  },
  drillLockedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  drillLockedText: {
    fontSize: 11,
    color: '#78909C',
    fontWeight: '700',
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
  comingSoonBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  comingSoonText: {
    fontSize: 11,
    color: '#78909C',
    fontWeight: '600',
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

  // TIPS CARD
  tipsCard: {
    backgroundColor: '#FFF8E1',
    padding: 24,
    borderRadius: 24,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#FFE082',
  },
  tipsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  tipsIcon: {
    fontSize: 26,
  },
  tipsTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#F57C00',
  },
  tipsList: {
    gap: 12,
  },
  tipItem: {
    backgroundColor: 'rgba(255, 152, 0, 0.1)',
    borderRadius: 12,
    padding: 14,
    borderLeftWidth: 3,
    borderLeftColor: '#FF9800',
  },
  tipContent: {
    gap: 6,
  },
  tipText: {
    fontSize: 14,
    color: '#5D4037',
    fontWeight: '600',
    lineHeight: 21,
    fontStyle: 'italic',
  },
  tipAuthor: {
    fontSize: 12,
    color: '#8D6E63',
    fontWeight: '700',
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

  // CAMERA MODE TOGGLE
  cameraModeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F0F7FF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#BDDEFF',
  },
  cameraModeInfo: {
    flex: 1,
    marginRight: 12,
  },
  cameraModeTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1a1a2e',
    marginBottom: 2,
  },
  cameraModeSubtitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#78909C',
  },
});
