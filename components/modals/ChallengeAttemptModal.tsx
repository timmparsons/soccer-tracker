import { PlayerChallenge, useCompleteChallenge } from '@/hooks/usePlayerChallenges';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface ChallengeAttemptModalProps {
  visible: boolean;
  onClose: () => void;
  challenge: PlayerChallenge;
  currentUserId: string;
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function ChallengeAttemptModal({
  visible,
  onClose,
  challenge,
  currentUserId,
}: ChallengeAttemptModalProps) {
  const insets = useSafeAreaInsets();
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [done, setDone] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { mutate: completeChallenge, isPending } = useCompleteChallenge();

  const opponentName =
    currentUserId === challenge.challenger_id
      ? challenge.challenged_name
      : challenge.challenger_name;

  const isChallenger = currentUserId === challenge.challenger_id;
  const myTime = isChallenger
    ? challenge.challenger_time_seconds
    : challenge.challenged_time_seconds;

  // Already submitted
  const alreadyDone = myTime !== null;

  useEffect(() => {
    if (!visible) {
      // Reset when modal closes
      setRunning(false);
      setElapsed(0);
      setDone(false);
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
  }, [visible]);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const startTimer = () => {
    setRunning(true);
    intervalRef.current = setInterval(() => {
      setElapsed((s) => s + 1);
    }, 1000);
  };

  const stopTimer = () => {
    setRunning(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
    setDone(true);
  };

  const handleSubmit = () => {
    const isChallenger = currentUserId === challenge.challenger_id;
    completeChallenge(
      {
        challengeId: challenge.id,
        userId: currentUserId,
        challengerId: challenge.challenger_id,
        challengedId: challenge.challenged_id,
        timeTakenSeconds: elapsed,
        existingChallengerTime: challenge.challenger_time_seconds,
        existingChallengedTime: challenge.challenged_time_seconds,
        opponentPushToken: isChallenger
          ? challenge.challenged_push_token
          : challenge.challenger_push_token,
      },
      {
        onSuccess: () => onClose(),
      },
    );
  };

  return (
    <Modal visible={visible} animationType='slide' transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
          {/* Handle */}
          <View style={styles.handle} />

          {/* Close */}
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Ionicons name='close' size={20} color='#6B7280' />
          </TouchableOpacity>

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.vsText}>You vs {opponentName}</Text>
            <View style={styles.targetPill}>
              <Text style={styles.targetText}>
                {challenge.touches_target} touches
              </Text>
            </View>
          </View>

          {alreadyDone ? (
            <View style={styles.waitingContainer}>
              <Text style={styles.waitingEmoji}>⏳</Text>
              <Text style={styles.waitingTitle}>Your time: {formatTime(myTime!)}</Text>
              <Text style={styles.waitingSubtitle}>
                Waiting for {opponentName} to finish…{'\n'}Results will be revealed when they're done.
              </Text>
              <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
                <Text style={styles.closeBtnText}>Close</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {/* Timer display */}
              <View style={styles.timerContainer}>
                <Text style={styles.timerLabel}>Your time</Text>
                <Text style={styles.timerValue}>{formatTime(elapsed)}</Text>
              </View>

              {/* Instructions */}
              {!running && !done && (
                <View style={styles.instructions}>
                  <Text style={styles.instructionsText}>
                    Tap Start when you're ready. Complete {challenge.touches_target} touches as fast
                    as you can, then tap Stop.
                  </Text>
                </View>
              )}

              {/* Controls */}
              {!done ? (
                <TouchableOpacity
                  style={[styles.actionButton, running ? styles.stopButton : styles.startButton]}
                  onPress={running ? stopTimer : startTimer}
                >
                  <Ionicons
                    name={running ? 'stop' : 'play'}
                    size={22}
                    color='#FFF'
                  />
                  <Text style={styles.actionButtonText}>
                    {running ? "I'm done!" : 'Start'}
                  </Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.doneContainer}>
                  <Text style={styles.doneText}>
                    Time: {formatTime(elapsed)}
                  </Text>
                  <Text style={styles.doneSubtext}>
                    Happy with that? Submit your result — {opponentName} won't see it until they
                    finish too.
                  </Text>
                  <TouchableOpacity
                    style={styles.submitButton}
                    onPress={handleSubmit}
                    disabled={isPending}
                  >
                    {isPending ? (
                      <ActivityIndicator color='#FFF' />
                    ) : (
                      <Text style={styles.submitButtonText}>Submit Result</Text>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.retryButton}
                    onPress={() => {
                      setElapsed(0);
                      setDone(false);
                    }}
                  >
                    <Text style={styles.retryButtonText}>Try Again</Text>
                  </TouchableOpacity>
                </View>
              )}
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 20,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
    gap: 8,
  },
  vsText: {
    fontSize: 22,
    fontWeight: '900',
    color: '#1a1a2e',
  },
  targetPill: {
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  targetText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1f89ee',
  },
  timerContainer: {
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
    borderRadius: 20,
    paddingVertical: 32,
    marginBottom: 20,
  },
  timerLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#78909C',
    marginBottom: 8,
  },
  timerValue: {
    fontSize: 64,
    fontWeight: '900',
    color: '#FFF',
    fontVariant: ['tabular-nums'],
  },
  instructions: {
    marginBottom: 20,
  },
  instructionsText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#78909C',
    textAlign: 'center',
    lineHeight: 20,
  },
  actionButton: {
    borderRadius: 14,
    paddingVertical: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 12,
  },
  startButton: {
    backgroundColor: '#31af4d',
  },
  stopButton: {
    backgroundColor: '#EF4444',
  },
  actionButtonText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFF',
  },
  doneContainer: {
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  doneText: {
    fontSize: 28,
    fontWeight: '900',
    color: '#1a1a2e',
  },
  doneSubtext: {
    fontSize: 13,
    fontWeight: '600',
    color: '#78909C',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 6,
  },
  submitButton: {
    backgroundColor: '#1f89ee',
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 40,
    alignItems: 'center',
    width: '100%',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FFF',
  },
  retryButton: {
    paddingVertical: 12,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#78909C',
  },
  waitingContainer: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 10,
  },
  waitingEmoji: {
    fontSize: 48,
  },
  waitingTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#1a1a2e',
  },
  waitingSubtitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#78909C',
    textAlign: 'center',
    lineHeight: 22,
  },
  closeBtn: {
    marginTop: 8,
    paddingVertical: 14,
    paddingHorizontal: 40,
    backgroundColor: '#F3F4F6',
    borderRadius: 14,
  },
  closeBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1a1a2e',
  },
});
