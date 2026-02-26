import PageHeader from '@/components/common/PageHeader';
import DrillVideoModal from '@/components/modals/DrillVideoModal';
import VinnieCelebrationModal from '@/components/modals/VinnieCelebrationModal';
import LogSessionModal from '@/components/modals/LogSessionModal';
import { useProfile } from '@/hooks/useProfile';
import { useDrills, useTouchTracking } from '@/hooks/useTouchTracking';
import { useUser } from '@/hooks/useUser';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  Vibration,
  View,
} from 'react-native';

// Pro tips - mix of quotes and practical training advice
const PRO_TIPS = [
  // Inspirational quotes
  { text: "The ball is like a magnet. If you can control it, you can do anything.", author: "Ronaldinho" },
  { text: "I always tell young players to work on your technique. That's the foundation.", author: "Xavi Hernández" },
  { text: "You have to fight to reach your dream. Sacrifice and work hard for it.", author: "Lionel Messi" },
  { text: "Every training session is an opportunity to improve. Never waste one.", author: "Pep Guardiola" },
  { text: "Ball control is everything. The best players touch the ball 10,000 times a day.", author: "Wiel Coerver" },
  { text: "Work on your weaknesses until they become your strengths.", author: "Johan Cruyff" },
  { text: "The secret is to believe in your dreams. They can come true.", author: "Cristiano Ronaldo" },

  // Practical tips - Ball Control
  { text: "Keep the ball close to your feet. The tighter your control, the harder you are to dispossess.", author: "Training Tip" },
  { text: "Use all surfaces of your foot - inside, outside, sole, and laces. Versatility is key.", author: "Training Tip" },
  { text: "Practice with your weaker foot as much as your strong foot. Two-footed players are unstoppable.", author: "Training Tip" },
  { text: "Keep your knees slightly bent and stay on your toes. Good balance means better control.", author: "Training Tip" },

  // Practical tips - First Touch
  { text: "Cushion the ball on your first touch. A soft touch keeps the ball close and ready.", author: "Training Tip" },
  { text: "Always know where you want to go before the ball arrives. Look up, then receive.", author: "Training Tip" },
  { text: "Practice receiving the ball while turning. It saves time and beats defenders.", author: "Training Tip" },

  // Practical tips - Dribbling
  { text: "Keep your head up while dribbling. The ball should be felt, not watched.", author: "Training Tip" },
  { text: "Change pace and direction suddenly. Unpredictability is your greatest weapon.", author: "Training Tip" },
  { text: "Use your body to shield the ball. Get between the defender and the ball.", author: "Training Tip" },

  // Practical tips - Training Habits
  { text: "Quality over quantity. 100 focused touches beat 500 sloppy ones.", author: "Training Tip" },
  { text: "Train in short bursts throughout the day. Consistency beats intensity.", author: "Training Tip" },
  { text: "Practice under pressure. Add time limits or challenges to simulate game situations.", author: "Training Tip" },
  { text: "Record yourself training. Watching your technique helps you spot mistakes.", author: "Training Tip" },

  // Game Speed Training
  { text: "Train faster than you play. If you can do it fast in training, it'll be easy in a game.", author: "Training Tip" },
  { text: "Perfect practice at slow speed is useless. The game is fast - your training should be too.", author: "Training Tip" },
  { text: "Mistakes at speed are better than perfection at a snail's pace. Learn from errors, keep pushing.", author: "Training Tip" },
  { text: "Aim for 50+ touches per minute. That's game speed. Anything less is warm-up.", author: "Training Tip" },
  { text: "Speed is a skill. The more you practice fast, the more comfortable you'll be under pressure.", author: "Training Tip" },
  { text: "In a game, you have 1-2 seconds on the ball. Train like you have even less.", author: "Training Tip" },
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
    (today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24)
  );
  const startIndex = (dayOfYear * 3) % PRO_TIPS.length;
  return [
    PRO_TIPS[startIndex % PRO_TIPS.length],
    PRO_TIPS[(startIndex + 1) % PRO_TIPS.length],
    PRO_TIPS[(startIndex + 2) % PRO_TIPS.length],
  ];
};

const TrainPage = () => {
  const { data: user } = useUser();
  const { data: profile } = useProfile(user?.id);
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
  const [challengeDrillId, setChallengeDrillId] = useState<string | undefined>();
  const [challengeName, setChallengeName] = useState<string | undefined>();
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoName, setVideoName] = useState<string>('');
  const [showVinnieCelebration, setShowVinnieCelebration] = useState(false);
  const [celebrationTouches, setCelebrationTouches] = useState(0);
  const [customMinutes, setCustomMinutes] = useState('');
  const [customSeconds, setCustomSeconds] = useState('');
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const tickSoundRef = useRef<Audio.Sound | null>(null);
  const whistleSoundRef = useRef<Audio.Sound | null>(null);

  const TIMER_OPTIONS = [
    { label: '30 sec', seconds: 30 },
    { label: '1 min', seconds: 60 },
    { label: '2 min', seconds: 120 },
    { label: '3 min', seconds: 180 },
    { label: '5 min', seconds: 300 },
    { label: '10 min', seconds: 600 },
  ];

  // Load timer sounds
  useEffect(() => {
    const loadSounds = async () => {
      const { sound: tick } = await Audio.Sound.createAsync(
        require('@/assets/sounds/whistle.mp3')
      );
      tickSoundRef.current = tick;

      const { sound: whistle } = await Audio.Sound.createAsync(
        require('@/assets/sounds/fulltime_whistle.mp3')
      );
      whistleSoundRef.current = whistle;
    };

    loadSounds();

    return () => {
      tickSoundRef.current?.unloadAsync();
      whistleSoundRef.current?.unloadAsync();
    };
  }, []);

  const { data: touchStats, isLoading, refetch } = useTouchTracking(user?.id);
  const { data: drills = [] } = useDrills();

  const handleSessionLogged = () => {
    refetch();
  };

  // Timer logic
  const startFreeTimer = useCallback((seconds: number) => {
    setFreeTimerDuration(seconds);
    setTimeRemaining(seconds);
    setShowTimerPicker(false);
    setShowTimerModal(true);
    // Don't auto-start; user taps Start
  }, []);

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
    setTimeRemaining(freeTimerDuration);
  }, [stopTimer, freeTimerDuration]);

  useEffect(() => {
    if (timerRunning) {
      timerRef.current = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            stopTimer();
            Vibration.vibrate([0, 500, 200, 500]);
            whistleSoundRef.current?.replayAsync();
            setShowTimerModal(false);
            setShowScoreModal(true);
            return 0;
          }
          if (prev <= 5) {
            tickSoundRef.current?.replayAsync();
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [timerRunning, stopTimer]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Helper to get local date in YYYY-MM-DD format
  const getLocalDate = (): string => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
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

  const cancelTimer = () => {
    Alert.alert(
      'Stop Timer?',
      'Are you sure you want to stop the timer?',
      [
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
      ]
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size='large' color='#2B9FFF' />
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

  return (
    <View style={styles.container}>
      <PageHeader
        title='Train'
        showAvatar={true}
        avatarUrl={profile?.avatar_url}
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
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
            <Text style={styles.librarySubtitle}>Tap a drill to log a session</Text>
          </View>

          {(['beginner', 'intermediate', 'advanced'] as const).map((level) => {
            const levelDrills = drillsByDifficulty[level];
            if (levelDrills.length === 0) return null;
            const color = DIFFICULTY_COLORS[level];
            return (
              <View key={level} style={styles.difficultySection}>
                <View style={[styles.difficultyHeader, { backgroundColor: color.bg }]}>
                  <Text style={[styles.difficultyLabel, { color: color.text }]}>
                    {level.toUpperCase()}
                  </Text>
                </View>
                <View style={styles.drillGrid}>
                  {levelDrills.map((drill) => (
                    <View key={drill.id} style={styles.drillCard}>
                      <TouchableOpacity
                        style={styles.drillTapArea}
                        onPress={() => {
                          setChallengeDrillId(drill.id);
                          setChallengeName(drill.name);
                          setModalVisible(true);
                        }}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.drillName}>{drill.name}</Text>
                        {drill.description && (
                          <Text style={styles.drillDescription} numberOfLines={2}>
                            {drill.description}
                          </Text>
                        )}
                      </TouchableOpacity>
                      {drill.video_url ? (
                        <TouchableOpacity
                          style={styles.videoButton}
                          onPress={() => {
                            setVideoUrl(drill.video_url!);
                            setVideoName(drill.name);
                          }}
                        >
                          <Ionicons name='play-circle' size={13} color='#10B981' />
                          <Text style={styles.videoButtonText}>Watch tutorial</Text>
                        </TouchableOpacity>
                      ) : (
                        <View style={styles.comingSoonBadge}>
                          <Ionicons name='videocam-outline' size={11} color='#78909C' />
                          <Text style={styles.comingSoonText}>Video coming soon</Text>
                        </View>
                      )}
                    </View>
                  ))}
                </View>
              </View>
            );
          })}
        </View>

        {/* Quick Tips */}
        <View style={styles.tipsCard}>
          <View style={styles.tipsHeader}>
            <Text style={styles.tipsIcon}>💡</Text>
            <Text style={styles.tipsTitle}>Today&apos;s Tips</Text>
          </View>
          <View style={styles.tipsList}>
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

      {/* Timer Modal */}
      <Modal
        visible={showTimerModal}
        animationType='fade'
        transparent={false}
        onRequestClose={cancelTimer}
      >
        <View style={styles.timerModal}>
          <View style={styles.timerContent}>
            <Text style={styles.timerChallengeName}>Free Practice</Text>
            <Text style={styles.timerInstructions}>Get as many touches as you can!</Text>

            <View style={styles.timerCircle}>
              <Text style={styles.timerText}>{formatTime(timeRemaining)}</Text>
              <Text style={styles.timerSubtext}>{timerRunning ? 'remaining' : 'paused'}</Text>
            </View>

            <View style={styles.timerControlButtons}>
              <TouchableOpacity style={styles.timerSecondaryButton} onPress={resetTimer}>
                <Ionicons name='refresh' size={20} color='rgba(255,255,255,0.8)' />
                <Text style={styles.timerSecondaryText}>Reset</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.timerStartPauseButton} onPress={pauseResumeTimer}>
                <Ionicons name={timerRunning ? 'pause' : 'play'} size={30} color='#2B9FFF' />
              </TouchableOpacity>

              <TouchableOpacity style={styles.timerSecondaryButton} onPress={cancelTimer}>
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
        onRequestClose={() => setShowScoreModal(false)}
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
      </Modal>

      {/* Timer Picker Modal */}
      <Modal
        visible={showTimerPicker}
        animationType='slide'
        transparent={true}
        onRequestClose={() => setShowTimerPicker(false)}
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
              {TIMER_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.seconds}
                  style={styles.timerOption}
                  onPress={() => startFreeTimer(option.seconds)}
                >
                  <Text style={styles.timerOptionText}>{option.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.customTimerSection}>
              <Text style={styles.customTimerLabel}>Custom duration</Text>
              <View style={styles.customTimerRow}>
                <View style={styles.customTimerInputGroup}>
                  <TextInput
                    style={styles.customTimerInput}
                    placeholder='0'
                    placeholderTextColor='#B0BEC5'
                    keyboardType='number-pad'
                    value={customMinutes}
                    onChangeText={setCustomMinutes}
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
                  />
                  <Text style={styles.customTimerUnit}>sec</Text>
                </View>
                <TouchableOpacity
                  style={[
                    styles.customTimerButton,
                    (!customMinutes && !customSeconds) && styles.customTimerButtonDisabled,
                  ]}
                  onPress={() => {
                    const mins = parseInt(customMinutes) || 0;
                    const secs = parseInt(customSeconds) || 0;
                    const total = mins * 60 + secs;
                    if (total > 0) {
                      startFreeTimer(total);
                      setCustomMinutes('');
                      setCustomSeconds('');
                    }
                  }}
                  disabled={!customMinutes && !customSeconds}
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
    backgroundColor: '#2B9FFF',
    paddingVertical: 28,
    paddingHorizontal: 24,
    borderRadius: 24,
    marginBottom: 20,
    shadowColor: '#2B9FFF',
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
    backgroundColor: '#FF7043',
    borderRadius: 16,
    paddingVertical: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#FF7043',
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
    marginBottom: 16,
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
    padding: 14,
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
    marginBottom: 8,
  },
  drillTapArea: {
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
  videoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  videoButtonText: {
    fontSize: 11,
    color: '#10B981',
    fontWeight: '700',
  },

  // TIMER MODAL
  timerModal: {
    flex: 1,
    backgroundColor: '#2B9FFF',
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
  customTimerLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#78909C',
    marginBottom: 12,
  },
  customTimerRow: {
    flexDirection: 'row',
    alignItems: 'center',
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
    marginBottom: 18,
  },
  customTimerButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  customTimerButtonDisabled: {
    backgroundColor: '#B0BEC5',
  },
  customTimerButtonText: {
    fontSize: 16,
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
});
