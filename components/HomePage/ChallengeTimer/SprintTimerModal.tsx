import { ChallengeResult, CountdownValue, useChallengeTimer } from '@/hooks/useChallengeTimer';
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useRef } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

// Placeholder tones — swap these two files for real recorded audio whenever you have it.
const COUNTDOWN_BEEP = require('../../../assets/audio/countdown-beep.wav');
const GO_SOUND = require('../../../assets/audio/go.wav');

function formatDuration(ms: number): string {
  return `${(ms / 1000).toFixed(2)}s`;
}

interface SprintTimerModalProps {
  visible: boolean;
  comboName: string;
  comboSteps: string[];
  personalBestMs: number | null;
  teamPaceMs: number | null;
  crownThresholdMs: number;
  onClose: () => void;
  onSubmit: (result: ChallengeResult) => void;
}

const SprintTimerModal: React.FC<SprintTimerModalProps> = ({
  visible,
  comboName,
  comboSteps,
  personalBestMs,
  teamPaceMs,
  crownThresholdMs,
  onClose,
  onSubmit,
}) => {
  const beepSoundRef = useRef<Audio.Sound | null>(null);
  const goSoundRef = useRef<Audio.Sound | null>(null);

  useEffect(() => {
    let beep: Audio.Sound | undefined;
    let go: Audio.Sound | undefined;
    (async () => {
      const [beepResult, goResult] = await Promise.all([
        Audio.Sound.createAsync(COUNTDOWN_BEEP),
        Audio.Sound.createAsync(GO_SOUND),
      ]);
      beep = beepResult.sound;
      go = goResult.sound;
      beepSoundRef.current = beep;
      goSoundRef.current = go;
    })();
    return () => {
      beep?.unloadAsync();
      go?.unloadAsync();
    };
  }, []);

  const playBeep = useCallback(() => {
    beepSoundRef.current?.replayAsync();
  }, []);

  const playGo = useCallback(() => {
    goSoundRef.current?.replayAsync();
  }, []);

  const timer = useChallengeTimer({
    personalBestMs,
    crownThresholdMs,
    onCountdownTick: (value) => {
      Haptics.impactAsync(
        value === 'GO' ? Haptics.ImpactFeedbackStyle.Heavy : Haptics.ImpactFeedbackStyle.Light
      );
      if (value === 'GO') {
        playGo();
      } else {
        playBeep();
      }
    },
    onStop: (result) => {
      if (result.isCrown || result.isPR) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
    },
  });

  useEffect(() => {
    if (visible) timer.start();
    // Only fire when the modal opens/closes — restarting on every timer-state
    // change would loop us straight back into 'countdown'.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const handleClose = () => {
    timer.reset();
    onClose();
  };

  const handleSubmit = () => {
    if (timer.result) onSubmit(timer.result);
    timer.reset();
    onClose();
  };

  return (
    <Modal visible={visible} animationType='fade' onRequestClose={handleClose} transparent={false}>
      <View style={styles.container}>
        {timer.status !== 'active' && (
          <Pressable style={styles.closeButton} onPress={handleClose} hitSlop={12}>
            <Ionicons name='close' size={26} color='#78909C' />
          </Pressable>
        )}

        {timer.status === 'countdown' && <CountdownView value={timer.countdownValue} />}

        {timer.status === 'active' && (
          <ActiveView elapsedMs={timer.elapsedMs} onStop={timer.stop} />
        )}

        {timer.status === 'complete' && timer.result && (
          <CompletionView
            comboName={comboName}
            comboSteps={comboSteps}
            result={timer.result}
            teamPaceMs={teamPaceMs}
            onRetry={timer.retry}
            onSubmit={handleSubmit}
          />
        )}
      </View>
    </Modal>
  );
};

export default SprintTimerModal;

const CountdownView: React.FC<{ value: CountdownValue }> = ({ value }) => {
  const scale = useSharedValue(0.6);

  useEffect(() => {
    scale.value = 0.6;
    scale.value = withSequence(withTiming(1.15, { duration: 150 }), withTiming(1, { duration: 150 }));
  }, [value, scale]);

  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <View style={styles.centerFill}>
      <Animated.Text style={[styles.countdownText, animatedStyle, value === 'GO' && styles.goText]}>
        {value}
      </Animated.Text>
    </View>
  );
};

const ActiveView: React.FC<{ elapsedMs: number; onStop: () => void }> = ({ elapsedMs, onStop }) => {
  const scale = useSharedValue(1);

  const handlePressIn = () => {
    scale.value = withTiming(0.97, { duration: 80 });
  };
  const handlePressOut = () => {
    scale.value = withTiming(1, { duration: 80 });
  };

  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Pressable
      style={styles.activeFill}
      onPress={onStop}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
    >
      <Text style={styles.elapsedText}>{formatDuration(elapsedMs)}</Text>
      <Animated.View style={[styles.stopTarget, animatedStyle]}>
        <Text style={styles.stopText}>STOP</Text>
      </Animated.View>
    </Pressable>
  );
};

interface CompletionViewProps {
  comboName: string;
  comboSteps: string[];
  result: ChallengeResult;
  teamPaceMs: number | null;
  onRetry: () => void;
  onSubmit: () => void;
}

const CompletionView: React.FC<CompletionViewProps> = ({ comboName, result, teamPaceMs, onRetry, onSubmit }) => {
  const paceDeltaMs = teamPaceMs != null ? teamPaceMs - result.durationMs : null;

  return (
    <View style={styles.completionContainer}>
      <Text style={styles.completionLabel}>{comboName}</Text>
      <Text style={styles.completionTime}>{formatDuration(result.durationMs)}</Text>

      {(result.isPR || result.isCrown) && (
        <View style={styles.badgeRow}>
          {result.isCrown && (
            <View style={[styles.badge, styles.crownBadge]}>
              <Ionicons name='trophy' size={16} color='#7C4A00' />
              <Text style={styles.badgeText}>Crown Pace</Text>
            </View>
          )}
          {result.isPR && (
            <View style={[styles.badge, styles.prBadge]}>
              <Ionicons name='flame' size={16} color='#B23B00' />
              <Text style={styles.badgeText}>New PR</Text>
            </View>
          )}
        </View>
      )}

      {paceDeltaMs != null && (
        <Text style={styles.paceText}>
          {paceDeltaMs >= 0
            ? `${formatDuration(paceDeltaMs)} faster than your team's average`
            : `${formatDuration(Math.abs(paceDeltaMs))} off your team's average`}
        </Text>
      )}

      <View style={styles.completionActions}>
        <Pressable style={[styles.actionButton, styles.retryButton]} onPress={onRetry}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </Pressable>
        <Pressable style={[styles.actionButton, styles.submitButton]} onPress={onSubmit}>
          <Text style={styles.submitButtonText}>Submit</Text>
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  closeButton: {
    position: 'absolute',
    top: 60,
    right: 24,
    zIndex: 10,
  },
  centerFill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countdownText: {
    fontSize: 120,
    fontWeight: '900',
    color: '#1f89ee',
  },
  goText: {
    color: '#31af4d',
  },
  activeFill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1a1a2e',
  },
  elapsedText: {
    position: 'absolute',
    top: 96,
    fontSize: 32,
    fontWeight: '900',
    color: '#FFFFFF',
    fontVariant: ['tabular-nums'],
  },
  stopTarget: {
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopText: {
    fontSize: 32,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  completionContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  completionLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: '#78909C',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  completionTime: {
    fontSize: 56,
    fontWeight: '900',
    color: '#1a1a2e',
    marginTop: 8,
    fontVariant: ['tabular-nums'],
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  crownBadge: {
    backgroundColor: '#FFE9B3',
  },
  prBadge: {
    backgroundColor: '#FFD6C2',
  },
  badgeText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1a1a2e',
  },
  paceText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#78909C',
    marginTop: 24,
    textAlign: 'center',
  },
  completionActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 32,
    width: '100%',
  },
  actionButton: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  retryButton: {
    backgroundColor: '#F0F4F8',
  },
  retryButtonText: {
    color: '#1a1a2e',
    fontWeight: '800',
    fontSize: 16,
  },
  submitButton: {
    backgroundColor: '#1f89ee',
    shadowColor: '#1f89ee',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 16,
  },
});
