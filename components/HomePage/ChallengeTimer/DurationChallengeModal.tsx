import CountdownView from '@/components/HomePage/ChallengeTimer/CountdownView';
import { useDurationChallengeTimer } from '@/hooks/useDurationChallengeTimer';
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  Keyboard,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import ConfettiCannon from 'react-native-confetti-cannon';

// Placeholder tones — swap these two files for real recorded audio whenever you have it.
const COUNTDOWN_BEEP = require('../../../assets/audio/countdown-beep.wav');
const GO_SOUND = require('../../../assets/audio/go.wav');

function formatRemaining(ms: number): string {
  const totalSeconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

interface DurationChallengeModalProps {
  visible: boolean;
  drillName: string;
  durationSeconds: number;
  personalBestReps: number | null;
  teamAvgReps: number | null;
  onClose: () => void;
  onSubmit: (repsCompleted: number, isPR: boolean) => void;
}

const DurationChallengeModal: React.FC<DurationChallengeModalProps> = ({
  visible,
  drillName,
  durationSeconds,
  personalBestReps,
  teamAvgReps,
  onClose,
  onSubmit,
}) => {
  const [repsInput, setRepsInput] = useState('');
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

  const timer = useDurationChallengeTimer({
    durationSeconds,
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
    onComplete: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
  });

  useEffect(() => {
    if (visible) {
      timer.start();
      setRepsInput('');
    }
    // Only fire when the modal opens/closes — restarting on every timer-state
    // change would loop us straight back into 'countdown'.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const handleClose = () => {
    Keyboard.dismiss();
    timer.reset();
    onClose();
  };

  const reps = repsInput ? parseInt(repsInput) : 0;
  const isPR = reps > 0 && (personalBestReps == null || reps > personalBestReps);

  const handleSubmit = () => {
    if (reps <= 0) return;
    Keyboard.dismiss();
    onSubmit(reps, isPR);
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
          <View style={styles.activeFill}>
            <Text style={styles.activeDrillName}>{drillName}</Text>
            <Text style={styles.remainingText}>{formatRemaining(timer.remainingMs)}</Text>
            <Text style={styles.activeHint}>Go as long as the clock is running!</Text>
          </View>
        )}

        {timer.status === 'complete' && (
          <RepsEntryView
            drillName={drillName}
            repsInput={repsInput}
            onChangeReps={setRepsInput}
            isPR={isPR}
            teamAvgReps={teamAvgReps}
            onRetry={timer.retry}
            onSubmit={handleSubmit}
            canSubmit={reps > 0}
          />
        )}
      </View>
    </Modal>
  );
};

export default DurationChallengeModal;

interface RepsEntryViewProps {
  drillName: string;
  repsInput: string;
  onChangeReps: (val: string) => void;
  isPR: boolean;
  teamAvgReps: number | null;
  onRetry: () => void;
  onSubmit: () => void;
  canSubmit: boolean;
}

const RepsEntryView: React.FC<RepsEntryViewProps> = ({
  drillName,
  repsInput,
  onChangeReps,
  isPR,
  teamAvgReps,
  onRetry,
  onSubmit,
  canSubmit,
}) => {
  const confettiRef = useRef<ConfettiCannon>(null);
  const { width } = Dimensions.get('window');

  useEffect(() => {
    if (isPR) setTimeout(() => confettiRef.current?.start(), 200);
  }, [isPR]);

  return (
    <View style={styles.completionContainer}>
      <Text style={styles.completionLabel}>Time&apos;s up!</Text>
      <Text style={styles.completionDrillName}>{drillName}</Text>
      <Text style={styles.repsPrompt}>How many reps did you get?</Text>

      <TextInput
        style={styles.repsInput}
        keyboardType='number-pad'
        returnKeyType='done'
        maxLength={4}
        placeholder='0'
        placeholderTextColor='#B0BEC5'
        value={repsInput}
        onChangeText={onChangeReps}
        autoFocus
      />

      {isPR && (
        <ConfettiCannon
          ref={confettiRef}
          count={180}
          origin={{ x: width / 2, y: -20 }}
          autoStart={false}
          fadeOut
          colors={['#ffb724', '#1f89ee', '#31af4d', '#FF6B6B', '#A855F7']}
        />
      )}

      {isPR && (
        <View style={styles.badgeRow}>
          <View style={styles.prBadge}>
            <Ionicons name='flame' size={16} color='#B23B00' />
            <Text style={styles.badgeText}>New PR</Text>
          </View>
        </View>
      )}

      {teamAvgReps != null && (
        <Text style={styles.paceText}>Team average: {teamAvgReps} reps</Text>
      )}

      <View style={styles.completionActions}>
        <Pressable style={[styles.actionButton, styles.retryButton]} onPress={onRetry}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </Pressable>
        <Pressable
          style={[styles.actionButton, styles.submitButton, !canSubmit && styles.submitButtonDisabled]}
          onPress={onSubmit}
          disabled={!canSubmit}
        >
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
  activeFill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1a1a2e',
    paddingHorizontal: 32,
  },
  activeDrillName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#B0BEC5',
    marginBottom: 8,
  },
  remainingText: {
    fontSize: 72,
    fontWeight: '900',
    color: '#FFFFFF',
    fontVariant: ['tabular-nums'],
  },
  activeHint: {
    fontSize: 15,
    fontWeight: '600',
    color: '#78909C',
    marginTop: 16,
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
  completionDrillName: {
    fontSize: 24,
    fontWeight: '900',
    color: '#1a1a2e',
    marginTop: 4,
  },
  repsPrompt: {
    fontSize: 15,
    fontWeight: '600',
    color: '#78909C',
    marginTop: 20,
  },
  repsInput: {
    fontSize: 56,
    fontWeight: '900',
    color: '#1a1a2e',
    marginTop: 8,
    minWidth: 140,
    textAlign: 'center',
    borderBottomWidth: 3,
    borderBottomColor: '#1f89ee',
    fontVariant: ['tabular-nums'],
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
  },
  prBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 12,
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
  submitButtonDisabled: {
    backgroundColor: '#B0BEC5',
    shadowOpacity: 0,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 16,
  },
});
