import { useJuggles } from '@/hooks/useJuggles';
import { useUpdateJuggles } from '@/hooks/useUpdateJuggles';
import { useUser } from '@/hooks/useUser';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { AnimatedCircularProgress } from 'react-native-circular-progress';
import XPToast from '../XPToast';
import CoachsTip from '../common/CoachsTip';

const TimerPage = () => {
  const params = useLocalSearchParams();
  const challengeXP = params.challengeXP
    ? parseInt(params.challengeXP as string, 10)
    : 20;

  const { data: user } = useUser();
  const { data: juggleStats } = useJuggles(user?.id);
  const updateJuggles = useUpdateJuggles(user?.id);

  // Timer
  const [timeLeft, setTimeLeft] = useState(300); // default 5 min
  const [totalTime, setTotalTime] = useState(300);
  const [isRunning, setIsRunning] = useState(false);

  // Modals
  const [showDurationPicker, setShowDurationPicker] = useState(false);
  const [showResultsModal, setShowResultsModal] = useState(false);
  const [showManualScoreModal, setShowManualScoreModal] = useState(false);

  // Custom time
  const [customMinutes, setCustomMinutes] = useState('');
  const minutes = totalTime / 60;

  // Results
  const [bestRecord, setBestRecord] = useState('');
  const [attempts, setAttempts] = useState('');

  // XP
  const [xpToastVisible, setXpToastVisible] = useState(false);
  const [xpAmount, setXpAmount] = useState(0);

  const playEndSound = async () => {
    try {
      const { sound } = await Audio.Sound.createAsync(
        require('@/assets/sounds/whistle.mp3')
      );
      await sound.playAsync();

      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          sound.unloadAsync();
        }
      });
    } catch (error) {
      console.log('Error playing sound:', error);
    }
  };

  // Timer countdown logic
  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | undefined;

    if (isRunning && timeLeft > 0) {
      timer = setInterval(() => setTimeLeft((t) => t - 1), 1000);
    } else if (timeLeft === 0 && isRunning) {
      setIsRunning(false);
      playEndSound();
      setShowResultsModal(true);
    }

    return () => {
      if (timer !== undefined) {
        clearInterval(timer);
      }
    };
  }, [isRunning, timeLeft]);

  const handleSetDuration = (seconds: number) => {
    setTotalTime(seconds);
    setTimeLeft(seconds);
    setIsRunning(false);
    setShowDurationPicker(false);
  };

  const handleReset = () => {
    setIsRunning(false);
    setTimeLeft(totalTime);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // ---- SAVE LOGIC ----
  const handleSaveResults = (isManual = false) => {
    const best = bestRecord ? parseInt(bestRecord, 10) : undefined;
    const attemptCount = attempts ? parseInt(attempts, 10) : undefined;

    // Validate that at least one field is filled
    if (!best && !attemptCount) {
      return; // Don't save if both fields are empty
    }

    const todayIso = new Date().toISOString().split('T')[0];
    const lastIso = juggleStats?.last_session_date
      ? juggleStats.last_session_date.split('T')[0]
      : null;

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayIso = yesterday.toISOString().split('T')[0];

    let newStreak = 1;

    if (lastIso === yesterdayIso)
      newStreak = (juggleStats?.streak_days ?? 0) + 1;
    else if (lastIso === todayIso) newStreak = juggleStats?.streak_days ?? 1;
    else newStreak = 1;

    const newBestStreak = Math.max(
      juggleStats?.best_daily_streak ?? 1,
      newStreak
    );

    updateJuggles.mutate(
      {
        high_score:
          best !== undefined && best > (juggleStats?.high_score ?? 0)
            ? best
            : undefined,
        last_score: best,
        attempts_count: attemptCount,
        last_session_duration: isManual ? 0 : totalTime, // Use 0 for manual entries instead of undefined
        sessions_count: (juggleStats?.sessions_count ?? 0) + 1,
        last_session_date: new Date().toISOString(),
        streak_days: newStreak,
        best_daily_streak: newBestStreak,
        challenge_xp: challengeXP, // Pass the challenge XP to award
      },
      {
        onSuccess: (data) => {
          const xp = data?.totalXpAwarded ?? 0;

          if (xp > 0) {
            setXpAmount(xp);
            setXpToastVisible(true);

            setTimeout(() => {
              setXpToastVisible(false);
            }, 1500);
          }

          setShowResultsModal(false);
          setShowManualScoreModal(false);
          setBestRecord('');
          setAttempts('');
          handleReset();
        },
        onError: (error) => {
          console.error('Error saving juggle results:', error);
          // Optionally show an error message to the user
        },
      }
    );
  };

  const isLowTime = timeLeft < 60 && timeLeft > 0;

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <View style={styles.iconBadge}>
            <Ionicons name='timer-outline' size={28} color='#FFA500' />
          </View>
          <View style={styles.titleContent}>
            <Text style={styles.title}>Timed Drill</Text>
            <Text style={styles.subtitle}>
              {`${minutes} minute${minutes === 1 ? '' : 's'} session`}
            </Text>
          </View>
        </View>
      </View>

      {/* STATS */}
      <View style={styles.statsCard}>
        <Text style={styles.statsRowTitle}>Last Session Stats</Text>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <View style={styles.statIconContainer}>
              <Ionicons name='time-outline' size={20} color='#2B9FFF' />
            </View>
            <Text style={styles.statValue}>
              {juggleStats?.last_session_duration
                ? `${Math.floor(juggleStats.last_session_duration / 60)}`
                : '—'}
            </Text>
            <Text style={styles.statLabel}>Minutes</Text>
          </View>

          <View style={[styles.statItem, styles.statItemBorder]}>
            <View style={styles.statIconContainer}>
              <Ionicons name='trophy-outline' size={20} color='#FFD700' />
            </View>
            <Text style={styles.statValue}>
              {juggleStats?.last_score ?? '—'}
            </Text>
            <Text style={styles.statLabel}>Best</Text>
          </View>

          <View style={styles.statItem}>
            <View style={styles.statIconContainer}>
              <Ionicons name='fitness-outline' size={20} color='#FFA500' />
            </View>
            <Text style={styles.statValue}>
              {juggleStats?.attempts_count ?? '—'}
            </Text>
            <Text style={styles.statLabel}>Attempts</Text>
          </View>
        </View>
      </View>

      {/* TIMER */}
      <View style={styles.timerWrapper}>
        <View style={styles.timerBackground}>
          <AnimatedCircularProgress
            size={260}
            width={14}
            fill={((totalTime - timeLeft) / totalTime) * 100}
            tintColor='#E5E7EB'
            backgroundColor={isLowTime ? '#EF4444' : '#2B9FFF'}
            rotation={0}
            lineCap='round'
          >
            {() => (
              <View style={styles.timerContent}>
                <Text
                  style={[
                    styles.timerText,
                    isLowTime && styles.timerTextDanger,
                  ]}
                >
                  {formatTime(timeLeft)}
                </Text>
                <Text
                  style={[
                    styles.timerUnit,
                    isLowTime && styles.timerUnitDanger,
                  ]}
                >
                  {isLowTime ? 'FINAL MINUTE' : 'MIN : SEC'}
                </Text>
              </View>
            )}
          </AnimatedCircularProgress>
        </View>
      </View>

      {/* BUTTONS */}
      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={[styles.button, styles.buttonStart]}
          onPress={() => setIsRunning(!isRunning)}
        >
          <Ionicons
            name={isRunning ? 'pause' : 'play'}
            size={24}
            color='#fff'
          />
          <Text style={styles.buttonLabel}>
            {isRunning ? 'Pause' : 'Start'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.buttonReset]}
          onPress={handleReset}
        >
          <Ionicons name='refresh' size={24} color='#fff' />
          <Text style={styles.buttonLabel}>Reset</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.buttonDuration]}
          onPress={() => setShowDurationPicker(true)}
        >
          <Ionicons name='time' size={24} color='#fff' />
          <Text style={styles.buttonLabel}>Duration</Text>
        </TouchableOpacity>
      </View>

      {/* ADD SCORE MANUALLY BUTTON */}
      <View style={styles.manualButtonContainer}>
        <TouchableOpacity
          style={styles.manualButton}
          onPress={() => setShowManualScoreModal(true)}
        >
          <Ionicons name='create-outline' size={24} color='#fff' />
          <Text style={styles.manualButtonText}>Add Score Manually</Text>
        </TouchableOpacity>
      </View>

      {/* TIP */}
      <View style={styles.tipContainer}>
        <CoachsTip />
      </View>

      {/* ---- DURATION PICKER MODAL ---- */}
      <Modal transparent visible={showDurationPicker} animationType='fade'>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <TouchableOpacity
            activeOpacity={1}
            style={styles.modalOverlay}
            onPress={() => setShowDurationPicker(false)}
          >
            <TouchableOpacity
              activeOpacity={1}
              onPress={(e) => e.stopPropagation()}
            >
              <ScrollView
                contentContainerStyle={{
                  flexGrow: 1,
                  justifyContent: 'center',
                }}
                keyboardShouldPersistTaps='handled'
              >
                <View style={styles.modalContent}>
                  <View style={styles.modalHeader}>
                    <Ionicons name='timer-outline' size={32} color='#FFA500' />
                    <Text style={styles.modalTitle}>Select Duration</Text>
                  </View>

                  <View style={styles.optionRow}>
                    {[300, 600, 900, 1200].map((value) => (
                      <Pressable
                        key={value}
                        style={styles.optionButton}
                        onPress={() => handleSetDuration(value)}
                      >
                        <Text style={styles.optionValue}>{value / 60}</Text>
                        <Text style={styles.optionLabel}>minutes</Text>
                      </Pressable>
                    ))}
                  </View>

                  {/* Custom Time */}
                  <View style={styles.customSection}>
                    <Text style={styles.customLabel}>Custom Duration</Text>

                    <TextInput
                      style={styles.customInput}
                      placeholder='Enter minutes...'
                      placeholderTextColor='#9CA3AF'
                      keyboardType='numeric'
                      value={customMinutes}
                      onChangeText={setCustomMinutes}
                    />

                    <TouchableOpacity
                      style={styles.customButton}
                      onPress={() => {
                        const mins = parseInt(customMinutes, 10);
                        if (!mins || mins <= 0) return;
                        handleSetDuration(mins * 60);
                        setCustomMinutes('');
                      }}
                    >
                      <Text style={styles.customButtonText}>
                        Set Custom Time
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={() => setShowDurationPicker(false)}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </TouchableOpacity>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>

      {/* ---- RESULTS MODAL ---- */}
      <Modal transparent visible={showResultsModal} animationType='slide'>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <TouchableOpacity
            activeOpacity={1}
            style={styles.modalOverlay}
            onPress={() => {
              setShowResultsModal(false);
              setBestRecord('');
              setAttempts('');
              handleReset();
            }}
          >
            <TouchableOpacity
              activeOpacity={1}
              onPress={(e) => e.stopPropagation()}
            >
              <ScrollView
                contentContainerStyle={{
                  flexGrow: 1,
                  justifyContent: 'center',
                }}
                keyboardShouldPersistTaps='handled'
              >
                <View style={styles.modalContent}>
                  <View style={styles.resultsIconContainer}>
                    <Ionicons
                      name='checkmark-circle'
                      size={64}
                      color='#4ADE80'
                    />
                  </View>

                  <Text style={styles.modalTitle}>Drill Complete!</Text>

                  <Text style={styles.modalSubtitle}>
                    Great work! You finished a {totalTime / 60}-minute training
                    session.
                  </Text>

                  <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>Best Juggle Count</Text>
                    <TextInput
                      style={styles.input}
                      placeholder='Enter your best count'
                      placeholderTextColor='#9CA3AF'
                      keyboardType='numeric'
                      value={bestRecord}
                      onChangeText={setBestRecord}
                    />
                  </View>

                  <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>Total Attempts</Text>
                    <TextInput
                      style={styles.input}
                      placeholder='How many tries?'
                      placeholderTextColor='#9CA3AF'
                      keyboardType='numeric'
                      value={attempts}
                      onChangeText={setAttempts}
                    />
                  </View>

                  <TouchableOpacity
                    style={styles.saveButton}
                    onPress={() => handleSaveResults(false)}
                  >
                    <Text style={styles.saveButtonText}>Save Results</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.skipButton}
                    onPress={() => {
                      setShowResultsModal(false);
                      setBestRecord('');
                      setAttempts('');
                      handleReset();
                    }}
                  >
                    <Text style={styles.skipButtonText}>Skip</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </TouchableOpacity>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>

      {/* ---- MANUAL SCORE MODAL ---- */}
      <Modal transparent visible={showManualScoreModal} animationType='slide'>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <TouchableOpacity
            activeOpacity={1}
            style={styles.modalOverlay}
            onPress={() => {
              setShowManualScoreModal(false);
              setBestRecord('');
              setAttempts('');
            }}
          >
            <TouchableOpacity
              activeOpacity={1}
              onPress={(e) => e.stopPropagation()}
            >
              <ScrollView
                contentContainerStyle={{
                  flexGrow: 1,
                  justifyContent: 'center',
                }}
                keyboardShouldPersistTaps='handled'
              >
                <View style={styles.modalContent}>
                  <View style={styles.resultsIconContainer}>
                    <Ionicons name='pencil' size={64} color='#2B9FFF' />
                  </View>

                  <Text style={styles.modalTitle}>Add Score Manually</Text>

                  <Text style={styles.modalSubtitle}>
                    Enter your juggling results from your practice session.
                  </Text>

                  <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>Best Juggle Count</Text>
                    <TextInput
                      style={styles.input}
                      placeholder='Enter your best count'
                      placeholderTextColor='#9CA3AF'
                      keyboardType='numeric'
                      value={bestRecord}
                      onChangeText={setBestRecord}
                    />
                  </View>

                  <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>Total Attempts</Text>
                    <TextInput
                      style={styles.input}
                      placeholder='How many tries?'
                      placeholderTextColor='#9CA3AF'
                      keyboardType='numeric'
                      value={attempts}
                      onChangeText={setAttempts}
                    />
                  </View>

                  <TouchableOpacity
                    style={styles.saveButton}
                    onPress={() => handleSaveResults(true)}
                  >
                    <Text style={styles.saveButtonText}>Save Results</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.skipButton}
                    onPress={() => {
                      setShowManualScoreModal(false);
                      setBestRecord('');
                      setAttempts('');
                    }}
                  >
                    <Text style={styles.skipButtonText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </TouchableOpacity>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>

      <XPToast visible={xpToastVisible} xp={xpAmount} />
    </View>
  );
};

export default TimerPage;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F9FF',
    paddingHorizontal: 16,
  },
  header: {
    marginTop: 40,
    marginBottom: 20,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBadge: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 165, 0, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleContent: {
    flex: 1,
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    color: '#2C3E50',
    lineHeight: 36,
  },
  subtitle: {
    fontSize: 15,
    color: '#6B7280',
    fontWeight: '600',
    marginTop: 2,
  },

  // STATS
  statsCard: {
    backgroundColor: '#2C3E50',
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  statsRowTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 16,
    color: '#FFA500',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statItemBorder: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '900',
    color: '#FFF',
    lineHeight: 32,
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '700',
    marginTop: 2,
  },

  // TIMER
  timerWrapper: {
    alignItems: 'center',
    marginTop: 32,
    marginBottom: 32,
  },
  timerBackground: {
    backgroundColor: '#FFF',
    borderRadius: 999,
    padding: 12,
    shadowColor: '#2B9FFF',
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  timerContent: {
    alignItems: 'center',
  },
  timerText: {
    fontSize: 56,
    fontWeight: '900',
    color: '#2C3E50',
    letterSpacing: -2,
  },
  timerTextDanger: {
    color: '#EF4444',
  },
  timerUnit: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 4,
    fontWeight: '700',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  timerUnitDanger: {
    color: '#EF4444',
    fontWeight: '900',
  },

  // BUTTONS
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 16,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonStart: {
    backgroundColor: '#2B9FFF',
  },
  buttonReset: {
    backgroundColor: '#6B7280',
  },
  buttonDuration: {
    backgroundColor: '#FFA500',
  },
  buttonLabel: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
  },

  // MANUAL SCORE BUTTON
  manualButtonContainer: {
    marginBottom: 4,
    paddingHorizontal: 8,
  },
  manualButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#22c55e',
    paddingVertical: 16,
    borderRadius: 16,
    shadowColor: '#22c55e',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  manualButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  tipContainer: {},
  // MODAL BASE
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(44, 62, 80, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: 28,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 26,
    fontWeight: '900',
    marginTop: 12,
    color: '#2C3E50',
    textAlign: 'center',
  },
  modalSubtitle: {
    color: '#6B7280',
    marginBottom: 24,
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    fontWeight: '500',
  },

  // DURATION PICKER
  optionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
    width: '100%',
    marginBottom: 24,
  },
  optionButton: {
    backgroundColor: '#2B9FFF',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 20,
    minWidth: 80,
    alignItems: 'center',
    shadowColor: '#2B9FFF',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  optionValue: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 28,
    lineHeight: 32,
  },
  optionLabel: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },

  customSection: {
    width: '100%',
    marginBottom: 20,
  },
  customLabel: {
    fontSize: 15,
    fontWeight: '800',
    color: '#2C3E50',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  customInput: {
    backgroundColor: '#F5F9FF',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    fontWeight: '600',
    color: '#2C3E50',
  },
  customButton: {
    backgroundColor: '#FFA500',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 12,
    shadowColor: '#FFA500',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  customButtonText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 15,
  },

  cancelButton: {
    paddingVertical: 12,
  },
  cancelButtonText: {
    color: '#6B7280',
    fontSize: 15,
    fontWeight: '700',
  },

  // RESULTS MODAL
  resultsIconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#F0FDF4',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  inputContainer: {
    width: '100%',
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: '#2C3E50',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: '#F5F9FF',
    borderRadius: 12,
    padding: 16,
    width: '100%',
    fontSize: 16,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    fontWeight: '600',
    color: '#2C3E50',
  },
  saveButton: {
    backgroundColor: '#FFA500',
    borderRadius: 16,
    paddingVertical: 16,
    width: '100%',
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#FFA500',
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 17,
    letterSpacing: 0.5,
  },
  skipButton: {
    marginTop: 12,
    paddingVertical: 12,
  },
  skipButtonText: {
    color: '#6B7280',
    fontSize: 15,
    fontWeight: '700',
  },
});
