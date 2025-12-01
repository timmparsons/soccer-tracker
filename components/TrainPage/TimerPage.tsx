import { useJuggles } from '@/hooks/useJuggles';
import { useUpdateJuggles } from '@/hooks/useUpdateJuggles';
import { useUser } from '@/hooks/useUser';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { AnimatedCircularProgress } from 'react-native-circular-progress';

const TimerPage = () => {
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

  // Custom time
  const [customMinutes, setCustomMinutes] = useState('');
  const minutes = totalTime / 60;

  // Results
  const [bestRecord, setBestRecord] = useState('');
  const [attempts, setAttempts] = useState('');

  // Timer countdown logic
  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | undefined;

    if (isRunning && timeLeft > 0) {
      timer = setInterval(() => setTimeLeft((t) => t - 1), 1000);
    } else if (timeLeft === 0 && isRunning) {
      setIsRunning(false);
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
  const handleSaveResults = () => {
    const best = bestRecord ? parseInt(bestRecord, 10) : undefined;
    const attemptCount = attempts ? parseInt(attempts, 10) : undefined;

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

    updateJuggles.mutate({
      high_score:
        best !== undefined && best > (juggleStats?.high_score ?? 0)
          ? best
          : undefined,
      last_score: best,
      attempts_count: attemptCount,
      last_session_duration: totalTime,
      sessions_count: (juggleStats?.sessions_count ?? 0) + 1,
      last_session_date: new Date().toISOString(),
      streak_days: newStreak,
      best_daily_streak: newBestStreak,
    });

    setShowResultsModal(false);
    setBestRecord('');
    setAttempts('');
    handleReset();
  };

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.title}>Timed Drill ⏱️</Text>
        <Text style={styles.subtitle}>
          {`Juggle as long as you can in ${minutes} minute${
            minutes === 1 ? '' : 's'
          }`}
        </Text>
      </View>

      {/* STATS */}
      <View style={styles.statsCard}>
        <Text style={styles.statsRowTitle}>Last Session</Text>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {juggleStats?.last_session_duration
                ? `${Math.floor(juggleStats.last_session_duration / 60)} min`
                : '—'}
            </Text>
            <Text style={styles.statLabel}>Duration</Text>
          </View>

          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {juggleStats?.high_score ?? '—'}
            </Text>
            <Text style={styles.statLabel}>Best Record</Text>
          </View>

          <View style={styles.statItem}>
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
            size={240}
            width={12}
            fill={(timeLeft / totalTime) * 100}
            tintColor='#3b82f6'
            backgroundColor='#e5e7eb'
            rotation={0}
          >
            {() => (
              <View style={styles.timerContent}>
                <Text style={styles.timerText}>{formatTime(timeLeft)}</Text>
                <Text style={styles.timerUnit}>minutes : seconds</Text>
              </View>
            )}
          </AnimatedCircularProgress>
        </View>
      </View>

      {/* BUTTONS */}
      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: '#3b82f6' }]}
          onPress={() => setIsRunning(!isRunning)}
        >
          <Ionicons
            name={isRunning ? 'pause' : 'play'}
            size={22}
            color='#fff'
          />
          <Text style={styles.buttonLabel}>
            {isRunning ? 'Pause' : 'Start'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, { backgroundColor: '#9ca3af' }]}
          onPress={handleReset}
        >
          <Ionicons name='refresh' size={22} color='#fff' />
          <Text style={styles.buttonLabel}>Reset</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, { backgroundColor: '#f59e0b' }]}
          onPress={() => setShowDurationPicker(true)}
        >
          <Ionicons name='time' size={22} color='#fff' />
          <Text style={styles.buttonLabel}>Set Duration</Text>
        </TouchableOpacity>
      </View>

      {/* TIP */}
      <View style={styles.tipCard}>
        <Text style={styles.tipTitle}>Coach&apos;s Tip 💬</Text>
        <Text style={styles.tipText}>
          Keep a steady rhythm — consistency over speed!
        </Text>
      </View>

      {/* ---- DURATION PICKER MODAL ---- */}
      <Modal transparent visible={showDurationPicker} animationType='fade'>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Duration</Text>

            <View style={styles.optionRow}>
              {[300, 600, 900, 1200].map((value) => (
                <Pressable
                  key={value}
                  style={styles.optionButton}
                  onPress={() => handleSetDuration(value)}
                >
                  <Text style={styles.optionText}>{value / 60} min</Text>
                </Pressable>
              ))}
            </View>

            {/* Custom Time */}
            <View style={{ marginTop: 20, width: '100%' }}>
              <Text style={styles.customLabel}>Custom Time (minutes)</Text>

              <TextInput
                style={styles.customInput}
                placeholder='Enter minutes...'
                keyboardType='numeric'
                value={customMinutes}
                onChangeText={setCustomMinutes}
              />

              <TouchableOpacity
                style={[
                  styles.button,
                  { backgroundColor: '#3b82f6', marginTop: 12 },
                ]}
                onPress={() => {
                  const mins = parseInt(customMinutes, 10);
                  if (!mins || mins <= 0) return;
                  handleSetDuration(mins * 60);
                  setCustomMinutes('');
                }}
              >
                <Text style={styles.buttonLabel}>Set Custom Time</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowDurationPicker(false)}
            >
              <Text style={styles.closeText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ---- RESULTS MODAL ---- */}
      <Modal transparent visible={showResultsModal} animationType='slide'>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Drill Complete 🎉</Text>

            <Text style={styles.modalSubtitle}>
              You completed a {totalTime / 60}-minute drill!
            </Text>

            <TextInput
              style={styles.input}
              placeholder='Best today'
              keyboardType='numeric'
              value={bestRecord}
              onChangeText={setBestRecord}
            />

            <TextInput
              style={styles.input}
              placeholder='Attempts'
              keyboardType='numeric'
              value={attempts}
              onChangeText={setAttempts}
            />

            <TouchableOpacity
              style={[
                styles.button,
                { backgroundColor: '#3b82f6', marginTop: 16 },
              ]}
              onPress={handleSaveResults}
            >
              <Text style={styles.buttonLabel}>Save Result</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{ marginTop: 12 }}
              onPress={() => setShowResultsModal(false)}
            >
              <Text style={styles.closeText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default TimerPage;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
    paddingHorizontal: 16,
  },
  header: { marginTop: 20 },
  title: { fontSize: 28, fontWeight: '700', color: '#111827' },
  subtitle: { fontSize: 15, color: '#6b7280' },
  statsCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginTop: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statsRowTitle: { fontSize: 18, fontWeight: '600', marginBottom: 12 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around' },
  statItem: { alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: '700', color: '#111827' },
  statLabel: { fontSize: 13, color: '#6b7280' },
  timerWrapper: { alignItems: 'center', marginTop: 48 },
  timerBackground: {
    backgroundColor: '#fff',
    borderRadius: 999,
    padding: 10,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  timerContent: { alignItems: 'center' },
  timerText: { fontSize: 48, fontWeight: '800', color: '#111827' },
  timerUnit: { fontSize: 14, color: '#6b7280', marginTop: 4 },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 12,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
  },
  buttonLabel: { color: '#fff', fontSize: 15, fontWeight: '600' },
  tipCard: {
    backgroundColor: '#e0f2fe',
    borderRadius: 16,
    padding: 16,
    marginVertical: 40,
  },
  tipTitle: { fontSize: 17, fontWeight: '700', color: '#0369a1' },
  tipText: { fontSize: 14, color: '#075985', lineHeight: 20 },

  // MODAL
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '85%',
    alignItems: 'center',
  },
  modalTitle: { fontSize: 22, fontWeight: '700', marginBottom: 8 },
  modalSubtitle: { color: '#6b7280', marginBottom: 16 },

  input: {
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    padding: 10,
    width: '100%',
    fontSize: 16,
    marginTop: 8,
  },
  optionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
  },
  optionButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  optionText: { color: '#fff', fontWeight: '600', fontSize: 16 },

  customLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
    textAlign: 'left',
  },
  customInput: {
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },

  closeButton: { marginTop: 20 },
  closeText: { color: '#6b7280', fontSize: 15 },
});
