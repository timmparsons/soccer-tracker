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

const TrainPage = () => {
  const { data: user } = useUser();
  const { data: profile } = useProfile(user?.id);
  const [modalVisible, setModalVisible] = useState(false);

  // Timer state
  const [timerActive, setTimerActive] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [showScoreModal, setShowScoreModal] = useState(false);
  const [scoreInput, setScoreInput] = useState('');
  const [submittingScore, setSubmittingScore] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

    setTimeRemaining(todayChallenge.challenge_duration_seconds);
    setTimerActive(true);
  }, [todayChallenge]);

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

    if (!user?.id || !todayChallenge) return;

    setSubmittingScore(true);

    try {
      const today = getLocalDate();
      const durationMinutes = Math.ceil(
        todayChallenge.challenge_duration_seconds / 60
      );

      const { error } = await supabase.from('daily_sessions').insert({
        user_id: user.id,
        drill_id: todayChallenge.id,
        touches_logged: score,
        duration_minutes: durationMinutes,
        date: today,
      });

      if (error) throw error;

      Alert.alert(
        'Challenge Complete!',
        `You logged ${score.toLocaleString()} ${todayChallenge.name}!`
      );

      setScoreInput('');
      setShowScoreModal(false);
      handleSessionLogged();
    } catch (error) {
      console.error('Error logging challenge:', error);
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
        <ActivityIndicator size='large' color='#5C6BC0' />
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

        {/* Log Session Button */}
        <TouchableOpacity
          style={styles.logButton}
          onPress={() => setModalVisible(true)}
          activeOpacity={0.8}
        >
          <View style={styles.logButtonContent}>
            <Ionicons name='add-circle' size={28} color='#FFF' />
            <Text style={styles.logButtonText}>LOG PRACTICE SESSION</Text>
          </View>
        </TouchableOpacity>

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
                <Ionicons name='time' size={14} color='#5C6BC0' />
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

        {/* Quick Tips */}
        <View style={styles.tipsCard}>
          <View style={styles.tipsHeader}>
            <Text style={styles.tipsIcon}>💡</Text>
            <Text style={styles.tipsTitle}>Pro Training Tips</Text>
          </View>
          <View style={styles.tipsList}>
            <View style={styles.tipItem}>
              <View style={styles.tipDot} />
              <Text style={styles.tipText}>
                Quality over quantity - focus on clean touches
              </Text>
            </View>
            <View style={styles.tipItem}>
              <View style={styles.tipDot} />
              <Text style={styles.tipText}>
                Practice in short bursts throughout the day
              </Text>
            </View>
            <View style={styles.tipItem}>
              <View style={styles.tipDot} />
              <Text style={styles.tipText}>
                Keep the ball close and under control
              </Text>
            </View>
            <View style={styles.tipItem}>
              <View style={styles.tipDot} />
              <Text style={styles.tipText}>
                Use both feet equally to develop balance
              </Text>
            </View>
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
              {todayChallenge?.name}
            </Text>
            <Text style={styles.timerInstructions}>
              Do as many as you can!
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
                How many {todayChallenge?.name} did you do?
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
    backgroundColor: '#5C6BC0',
    paddingVertical: 28,
    paddingHorizontal: 24,
    borderRadius: 24,
    marginBottom: 20,
    shadowColor: '#5C6BC0',
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

  // LOG BUTTON
  logButton: {
    backgroundColor: '#FF7043',
    borderRadius: 20,
    paddingVertical: 22,
    marginBottom: 24,
    shadowColor: '#FF7043',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  logButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  logButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 1.2,
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
    color: '#5C6BC0',
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
    backgroundColor: '#5C6BC0',
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
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  tipDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FF9800',
    marginTop: 7,
  },
  tipText: {
    flex: 1,
    fontSize: 14,
    color: '#5D4037',
    fontWeight: '600',
    lineHeight: 20,
  },
});
