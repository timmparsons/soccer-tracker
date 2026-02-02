import PageHeader from '@/components/common/PageHeader';
import LogSessionModal from '@/components/modals/LogSessionModal';
import { useProfile } from '@/hooks/useProfile';
import { useTodayChallenge, useTouchTracking } from '@/hooks/useTouchTracking';
import { useUser } from '@/hooks/useUser';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
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
  const [timerActive, setTimerActive] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [showScoreModal, setShowScoreModal] = useState(false);
  const [scoreInput, setScoreInput] = useState('');
  const [submittingScore, setSubmittingScore] = useState(false);
  const [isFreeTimer, setIsFreeTimer] = useState(false);
  const [freeTimerDuration, setFreeTimerDuration] = useState(0);
  const [showTimerPicker, setShowTimerPicker] = useState(false);
  const [customMinutes, setCustomMinutes] = useState('');
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const TIMER_OPTIONS = [
    { label: '1 min', seconds: 60 },
    { label: '2 min', seconds: 120 },
    { label: '3 min', seconds: 180 },
    { label: '5 min', seconds: 300 },
    { label: '10 min', seconds: 600 },
  ];

  const { data: touchStats, isLoading, refetch } = useTouchTracking(user?.id);
  const { data: todayChallenge, refetch: refetchChallenge } = useTodayChallenge(
    user?.id
  );

  const handleSessionLogged = () => {
    refetch();
    refetchChallenge();
  };

  // Timer logic
  const startTimer = useCallback(() => {
    if (!todayChallenge?.challenge_duration_seconds) return;

    setIsFreeTimer(false);
    setTimeRemaining(todayChallenge.challenge_duration_seconds);
    setTimerActive(true);
  }, [todayChallenge]);

  const startFreeTimer = useCallback((seconds: number) => {
    setIsFreeTimer(true);
    setFreeTimerDuration(seconds);
    setTimeRemaining(seconds);
    setShowTimerPicker(false);
    setTimerActive(true);
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setTimerActive(false);
  }, []);

  useEffect(() => {
    if (timerActive) {
      timerRef.current = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            // Timer finished
            stopTimer();
            Vibration.vibrate([0, 500, 200, 500]); // Vibrate pattern
            setShowScoreModal(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [timerActive, stopTimer]);

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
    if (!isFreeTimer && !todayChallenge) return;

    setSubmittingScore(true);

    try {
      const today = getLocalDate();
      const durationMinutes = isFreeTimer
        ? Math.ceil(freeTimerDuration / 60)
        : Math.ceil(todayChallenge!.challenge_duration_seconds / 60);

      const { error } = await supabase.from('daily_sessions').insert({
        user_id: user.id,
        drill_id: isFreeTimer ? null : todayChallenge!.id,
        touches_logged: score,
        duration_minutes: durationMinutes,
        date: today,
      });

      if (error) throw error;

      Alert.alert(
        isFreeTimer ? 'Session Complete!' : 'Challenge Complete!',
        isFreeTimer
          ? `You logged ${score.toLocaleString()} touches!`
          : `You logged ${score.toLocaleString()} ${todayChallenge!.name}!`
      );

      setScoreInput('');
      setShowScoreModal(false);
      setIsFreeTimer(false);
      setFreeTimerDuration(0);
      handleSessionLogged();
    } catch (error) {
      console.error('Error logging session:', error);
      Alert.alert('Error', 'Failed to save your score. Please try again.');
    } finally {
      setSubmittingScore(false);
    }
  };

  const cancelChallenge = () => {
    Alert.alert(
      'Cancel Challenge?',
      'Are you sure you want to stop the timer?',
      [
        { text: 'Keep Going', style: 'cancel' },
        {
          text: 'Stop',
          style: 'destructive',
          onPress: () => {
            stopTimer();
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

  const challengeDurationFormatted = todayChallenge?.challenge_duration_seconds
    ? formatTime(todayChallenge.challenge_duration_seconds)
    : '2:00';

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

        {/* Today's Timed Challenge */}
        {todayChallenge && (
          <View style={styles.challengeCard}>
            <View style={styles.challengeTopBar}>
              <View style={styles.challengeBadge}>
                <Text style={styles.challengeBadgeText}>
                  TIMED CHALLENGE
                </Text>
              </View>
              <View style={styles.timerBadge}>
                <Ionicons name='time' size={14} color='#2B9FFF' />
                <Text style={styles.timerBadgeText}>
                  {challengeDurationFormatted}
                </Text>
              </View>
            </View>

            <View style={styles.challengeContent}>
              <Text style={styles.challengePrompt}>Do as many</Text>
              <Text style={styles.challengeName}>{todayChallenge.name}</Text>
              <Text style={styles.challengePrompt}>
                as you can in {challengeDurationFormatted}
              </Text>
            </View>

            {todayChallenge.description && (
              <Text style={styles.challengeDescription}>
                {todayChallenge.description}
              </Text>
            )}

            <TouchableOpacity
              style={styles.startButton}
              onPress={startTimer}
              activeOpacity={0.8}
            >
              <Ionicons name='play' size={24} color='#FFF' />
              <Text style={styles.startButtonText}>START CHALLENGE</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Training Videos */}
        <View style={styles.videosCard}>
          <View style={styles.videosHeader}>
            <Text style={styles.videosIcon}>🎬</Text>
            <Text style={styles.videosTitle}>Training Videos</Text>
          </View>

          <View style={styles.videosPlaceholder}>
            <Ionicons name='videocam' size={48} color='#B0BEC5' />
            <Text style={styles.videosPlaceholderText}>Coming Soon</Text>
            <Text style={styles.videosPlaceholderSubtext}>
              Pro tutorials and drills to level up your game
            </Text>
          </View>
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
        visible={timerActive}
        animationType='fade'
        transparent={false}
        onRequestClose={cancelChallenge}
      >
        <View style={styles.timerModal}>
          <View style={styles.timerContent}>
            <Text style={styles.timerChallengeName}>
              {isFreeTimer ? 'Free Practice' : todayChallenge?.name}
            </Text>
            <Text style={styles.timerInstructions}>
              {isFreeTimer ? 'Get as many touches as you can!' : 'Do as many as you can!'}
            </Text>

            <View style={styles.timerCircle}>
              <Text style={styles.timerText}>{formatTime(timeRemaining)}</Text>
              <Text style={styles.timerSubtext}>remaining</Text>
            </View>

            <TouchableOpacity
              style={styles.cancelTimerButton}
              onPress={cancelChallenge}
            >
              <Text style={styles.cancelTimerText}>Cancel</Text>
            </TouchableOpacity>
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
                {isFreeTimer
                  ? 'How many touches did you get?'
                  : `How many ${todayChallenge?.name} did you do?`}
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
                <TextInput
                  style={styles.customTimerInput}
                  placeholder='Minutes'
                  placeholderTextColor='#B0BEC5'
                  keyboardType='number-pad'
                  value={customMinutes}
                  onChangeText={setCustomMinutes}
                />
                <TouchableOpacity
                  style={[
                    styles.customTimerButton,
                    !customMinutes && styles.customTimerButtonDisabled,
                  ]}
                  onPress={() => {
                    const mins = parseInt(customMinutes);
                    if (mins > 0) {
                      startFreeTimer(mins * 60);
                      setCustomMinutes('');
                    }
                  }}
                  disabled={!customMinutes}
                >
                  <Text style={styles.customTimerButtonText}>Start</Text>
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              style={styles.timerPickerCancel}
              onPress={() => {
                setShowTimerPicker(false);
                setCustomMinutes('');
              }}
            >
              <Text style={styles.timerPickerCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Regular Log Session Modal */}
      {user?.id && (
        <LogSessionModal
          visible={modalVisible}
          onClose={() => setModalVisible(false)}
          userId={user.id}
          onSuccess={handleSessionLogged}
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

  // CHALLENGE CARD
  challengeCard: {
    backgroundColor: '#FFF',
    padding: 24,
    borderRadius: 24,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
  },
  challengeTopBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  challengeBadge: {
    backgroundColor: '#FF7043',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
  },
  challengeBadgeText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  timerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#E8EAF6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  timerBadgeText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#2B9FFF',
  },
  challengeContent: {
    alignItems: 'center',
    marginBottom: 16,
  },
  challengePrompt: {
    fontSize: 16,
    fontWeight: '600',
    color: '#78909C',
  },
  challengeName: {
    fontSize: 28,
    fontWeight: '900',
    color: '#1a1a2e',
    marginVertical: 8,
    textAlign: 'center',
  },
  challengeDescription: {
    fontSize: 14,
    color: '#78909C',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
    fontWeight: '500',
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#4CAF50',
    paddingVertical: 16,
    borderRadius: 16,
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  startButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.5,
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
  cancelTimerButton: {
    paddingVertical: 12,
    paddingHorizontal: 32,
  },
  cancelTimerText: {
    fontSize: 16,
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

  // VIDEOS CARD
  videosCard: {
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
  videosHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  videosIcon: {
    fontSize: 24,
  },
  videosTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#1a1a2e',
  },
  videosPlaceholder: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  videosPlaceholderText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#78909C',
    marginTop: 12,
  },
  videosPlaceholderSubtext: {
    fontSize: 14,
    fontWeight: '500',
    color: '#B0BEC5',
    marginTop: 4,
    textAlign: 'center',
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
    gap: 12,
  },
  customTimerInput: {
    flex: 1,
    backgroundColor: '#F5F7FA',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a2e',
    borderWidth: 2,
    borderColor: '#E5E7EB',
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
