import { useJuggles } from '@/hooks/useJuggles';
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
  const [timeLeft, setTimeLeft] = useState(300); // default 5 mins
  const [totalTime, setTotalTime] = useState(300);
  const [isRunning, setIsRunning] = useState(false);
  const [showDurationPicker, setShowDurationPicker] = useState(false);
  const [showResultsModal, setShowResultsModal] = useState(false);
  const [bestRecord, setBestRecord] = useState('');
  const [attempts, setAttempts] = useState('');
  const { data: juggleStats } = useJuggles(user?.id);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isRunning && timeLeft > 0) {
      timer = setInterval(() => setTimeLeft((t) => t - 1), 1000);
    } else if (timeLeft === 0 && isRunning) {
      setIsRunning(false);
      setShowResultsModal(true);
    }
    return () => clearInterval(timer);
  }, [isRunning, timeLeft]);

  const handleReset = () => {
    setIsRunning(false);
    setTimeLeft(totalTime);
  };

  const handleSetDuration = (seconds: number) => {
    setTotalTime(seconds);
    setTimeLeft(seconds);
    setShowDurationPicker(false);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handleSaveResults = () => {
    console.log('Best:', bestRecord);
    setShowResultsModal(false);
    updateJuggles.mutate({
      high_score: bestRecord ? parseInt(bestRecord, 10) : undefined,
      last_session_duration: totalTime,
    });
    handleReset();
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Timed Drill ⏱️</Text>
        <Text style={styles.subtitle}>
          Juggle as long as you can in {totalTime / 60} minutes
        </Text>
      </View>

      {/* Stats Card */}
      <View style={styles.statsCard}>
        <Text style={styles.statsRowTitle}>Last Session</Text>
        <View style={styles.statsRow}>
          {/* Duration */}
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {juggleStats?.last_session_duration
                ? `${Math.floor(juggleStats.last_session_duration / 60)} min`
                : '—'}
            </Text>
            <Text style={styles.statLabel}>Duration</Text>
          </View>

          {/* Best Record */}
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {juggleStats?.high_score ?? '—'}
            </Text>
            <Text style={styles.statLabel}>Best Record</Text>
          </View>

          {/* Attempts */}
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {juggleStats?.attempts_count ?? '—'}
            </Text>
            <Text style={styles.statLabel}>Attempts</Text>
          </View>
        </View>
      </View>

      {/* Timer Circle */}
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

      {/* Control Buttons */}
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

      {/* Tip Card */}
      <View style={styles.tipCard}>
        <Text style={styles.tipTitle}>Coach&apos;s Tip 💬</Text>
        <Text style={styles.tipText}>
          Keep a steady rhythm — consistency over speed! Take short breaks
          between longer sessions to maintain focus.
        </Text>
      </View>

      {/* Duration Picker Modal */}
      <Modal
        transparent
        visible={showDurationPicker}
        animationType='fade'
        onRequestClose={() => setShowDurationPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Duration</Text>
            <View style={styles.optionRow}>
              {[
                { label: '5 min', value: 300 },
                { label: '10 min', value: 600 },
                { label: '15 min', value: 900 },
                { label: '20 min', value: 1200 },
              ].map((opt) => (
                <Pressable
                  key={opt.value}
                  style={styles.optionButton}
                  onPress={() => handleSetDuration(opt.value)}
                >
                  <Text style={styles.optionText}>{opt.label}</Text>
                </Pressable>
              ))}
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

      {/* Results Input Modal */}
      <Modal
        transparent
        visible={false}
        animationType='slide'
        onRequestClose={() => setShowResultsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Drill Complete 🎉</Text>

            {/* Auto-filled duration */}
            <Text style={styles.modalSubtitle}>
              You completed a {totalTime / 60}-minute drill.
            </Text>

            {/* Best today input */}
            <TextInput
              style={styles.input}
              placeholder='Best today'
              keyboardType='numeric'
              value={bestRecord}
              onChangeText={setBestRecord}
            />

            {/* Attempts input */}
            <TextInput
              style={styles.input}
              placeholder='Number of attempts'
              keyboardType='numeric'
              value={attempts}
              onChangeText={setAttempts}
            />

            {/* Save button */}
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
    paddingHorizontal: 16,
  },
  header: {
    marginTop: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
  },
  subtitle: {
    fontSize: 15,
    color: '#6b7280',
  },
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
  statsRowTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: { alignItems: 'center' },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  statLabel: {
    fontSize: 13,
    color: '#6b7280',
  },
  timerWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 48,
  },
  timerBackground: {
    backgroundColor: '#fff',
    borderRadius: 999,
    padding: 10,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  timerContent: { alignItems: 'center', justifyContent: 'center' },
  timerText: { fontSize: 48, fontWeight: '800', color: '#111827' },
  timerUnit: { fontSize: 14, color: '#6b7280', marginTop: 4 },
  buttonRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
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
  buttonLabel: { fontSize: 15, fontWeight: '600', color: '#fff' },
  tipCard: {
    backgroundColor: '#e0f2fe',
    borderRadius: 16,
    padding: 16,
    marginVertical: 40,
  },
  tipTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0369a1',
    marginBottom: 4,
  },
  tipText: { fontSize: 14, color: '#075985', lineHeight: 20 },

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
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  modalSubtitle: {
    color: '#6b7280',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
  },
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
  optionText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  closeButton: { marginTop: 20 },
  closeText: { color: '#6b7280', fontSize: 15 },
});

export default TimerPage;
