import CountdownView from '@/components/HomePage/ChallengeTimer/CountdownView';
import DrillVideoModal from '@/components/modals/DrillVideoModal';
import { useAndroidModalKeyboard } from '@/hooks/useAndroidModalKeyboard';
import { useChallengeTimer } from '@/hooks/useChallengeTimer';
import { IntervalPhase, useIntervalTimer } from '@/hooks/useIntervalTimer';
import { calculateChallengeTouches, DailyChallengeStep, logChallengeSession } from '@/hooks/useDailyChallenge';
import { getTodayTouchTotal, MAX_DAILY_TOUCHES } from '@/lib/touchLimits';
import { getLocalDate } from '@/utils/getLocalDate';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  BackHandler,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  Vibration,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface Props {
  visible: boolean;
  onClose: () => void;
  workout: { id: string; title: string; durationSeconds: number | null };
  steps: DailyChallengeStep[];
  profileId: string;
  onCompleted: () => void;
}

type RunnerState = 'ready' | 'countdown' | 'running' | 'earlyExit' | 'done';

async function creditedTouches(userId: string, rawTouches: number): Promise<number> {
  const todayTotal = await getTodayTouchTotal(userId, getLocalDate());
  return Math.max(0, Math.min(rawTouches, MAX_DAILY_TOUCHES - todayTotal));
}

const stepLabel = (step: DailyChallengeStep): string =>
  step.type === 'single' ? step.drillName : step.comboName;

const stepVideo = (step: DailyChallengeStep): { drillName: string; videoUrl: string } | null => {
  if (step.type === 'single') {
    return step.videoUrl ? { drillName: step.drillName, videoUrl: step.videoUrl } : null;
  }
  const drill = step.drills.find((d) => d.videoUrl);
  return drill ? { drillName: drill.drillName, videoUrl: drill.videoUrl! } : null;
};

function buildPhases(steps: DailyChallengeStep[], durationSeconds: number): IntervalPhase[] {
  const stationSeconds = Math.max(1, Math.round(durationSeconds / steps.length));
  return steps.map((step) => ({ label: stepLabel(step), seconds: stationSeconds, cueSound: 'work' }));
}

const CircuitRunnerModal = ({ visible, onClose, workout, steps, profileId, onCompleted }: Props) => {
  const [state, setState] = useState<RunnerState>('ready');
  const [saving, setSaving] = useState(false);
  const [earlyTouchesInput, setEarlyTouchesInput] = useState('');
  const [loggedTouches, setLoggedTouches] = useState(0);
  const [videoStep, setVideoStep] = useState<{ drillName: string; videoUrl: string } | null>(null);
  const beepSoundRef = useRef<Audio.Sound | null>(null);
  const whistleSoundRef = useRef<Audio.Sound | null>(null);
  const totalTouches = calculateChallengeTouches(steps);
  const durationSeconds = workout.durationSeconds ?? steps.length * 30;

  const phases = buildPhases(steps, durationSeconds);

  const elapsedSeconds = () => {
    const completedPhasesSeconds = phases
      .slice(0, timer.phaseIndex)
      .reduce((sum, p) => sum + p.seconds, 0);
    const currentPhaseSeconds = phases[timer.phaseIndex]?.seconds ?? 0;
    return completedPhasesSeconds + (currentPhaseSeconds - timer.secondsRemaining);
  };

  const handleStationChange = (phase: IntervalPhase) => {
    Vibration.vibrate(80);
    beepSoundRef.current?.replayAsync();
  };

  const handleComplete = async () => {
    whistleSoundRef.current?.replayAsync();
    setSaving(true);
    try {
      const credited = await creditedTouches(profileId, totalTouches);
      await logChallengeSession(profileId, credited, durationSeconds);
      setLoggedTouches(credited);
      onCompleted();
    } catch {
      // Completion screen still shows even if the save failed
    } finally {
      setSaving(false);
    }
    setState('done');
  };

  const handleClosePress = () => {
    if (state === 'running') {
      timer.pause();
      Alert.alert(
        'End circuit?',
        "You haven't finished all the stations. Log the touches you got before you go?",
        [
          { text: 'Keep Going', style: 'cancel', onPress: () => timer.start() },
          { text: 'End & Log', style: 'destructive', onPress: () => setState('earlyExit') },
        ],
      );
      return;
    }
    handleClose();
  };

  const handleSubmitEarlyTouches = async () => {
    const touches = parseInt(earlyTouchesInput, 10);
    if (!touches || touches <= 0) return;
    setSaving(true);
    try {
      const credited = await creditedTouches(profileId, touches);
      await logChallengeSession(profileId, credited, elapsedSeconds());
      setLoggedTouches(credited);
      onCompleted();
      handleClose();
    } catch {
      setSaving(false);
    }
  };

  const timer = useIntervalTimer(phases, {
    onPhaseChange: handleStationChange,
    onComplete: handleComplete,
  });

  const preTimer = useChallengeTimer({
    personalBestMs: null,
    crownThresholdMs: Infinity,
    onGo: () => {
      setState('running');
      timer.start();
    },
  });

  useEffect(() => {
    Audio.Sound.createAsync(require('@/assets/audio/countdown-beep.wav')).then(({ sound }) => {
      beepSoundRef.current = sound;
    });
    Audio.Sound.createAsync(require('@/assets/sounds/whistle.mp3')).then(({ sound }) => {
      whistleSoundRef.current = sound;
    });
    return () => {
      beepSoundRef.current?.unloadAsync();
      whistleSoundRef.current?.unloadAsync();
    };
  }, []);

  useEffect(() => {
    if (!visible) {
      setState('ready');
      setEarlyTouchesInput('');
      timer.reset();
      preTimer.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const handleStart = () => {
    setState('countdown');
    preTimer.start();
  };

  const handleClose = () => {
    timer.reset();
    preTimer.reset();
    onClose();
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = String(seconds % 60).padStart(2, '0');
    return `${m}:${s}`;
  };

  const isDark = state === 'running' || state === 'countdown';
  const { onDialogLayout, kbOverlap } = useAndroidModalKeyboard();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!visible) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      handleClosePress();
      return true;
    });
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, state]);

  if (!visible) return null;

  return (
    <>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={[styles.container, { backgroundColor: isDark ? '#1a1a2e' : '#FFFFFF' }]}
        onLayout={onDialogLayout}
      >
        <TouchableOpacity
          style={[styles.closeButton, { top: insets.top + 12 }]}
          onPress={handleClosePress}
          hitSlop={12}
        >
          <Ionicons name='close' size={28} color={isDark ? '#FFF' : '#78909C'} />
        </TouchableOpacity>

        {state === 'ready' && (
          <View style={styles.content}>
            <Text style={styles.sectionLabel}>CIRCUIT</Text>
            <Text style={styles.title}>{workout.title}</Text>
            <View style={styles.stationsList}>
              {phases.map((p, i) => {
                const video = stepVideo(steps[i]);
                return (
                  <View key={i} style={styles.stationRow}>
                    <View style={styles.stationNumber}>
                      <Text style={styles.stationNumberText}>{i + 1}</Text>
                    </View>
                    <Text style={styles.stationLabel}>{p.label}</Text>
                    {video && (
                      <TouchableOpacity
                        onPress={() => setVideoStep(video)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Ionicons name='play-circle-outline' size={22} color='#1f89ee' />
                      </TouchableOpacity>
                    )}
                    <Text style={styles.stationSeconds}>{p.seconds}s</Text>
                  </View>
                );
              })}
            </View>
            <Text style={styles.touchEstimate}>≈ {totalTouches.toLocaleString()} touches</Text>
            <TouchableOpacity style={styles.startButton} onPress={handleStart} activeOpacity={0.85}>
              <Ionicons name='play' size={22} color='#FFF' />
              <Text style={styles.startButtonText}>Start</Text>
            </TouchableOpacity>
          </View>
        )}

        {state === 'countdown' && <CountdownView value={preTimer.countdownValue} />}

        {state === 'running' && timer.currentPhase && (
          <View style={styles.content}>
            <Text style={styles.runningRound}>
              Station {timer.phaseIndex + 1} / {phases.length}
            </Text>
            <Text style={styles.runningLabel}>{timer.currentPhase.label}</Text>
            <Text style={styles.runningTime}>{formatTime(timer.secondsRemaining)}</Text>
            <TouchableOpacity
              style={styles.pauseButton}
              onPress={() => (timer.isRunning ? timer.pause() : timer.start())}
              hitSlop={12}
              activeOpacity={0.8}
            >
              <Ionicons name={timer.isRunning ? 'pause' : 'play'} size={26} color='#FFF' />
            </TouchableOpacity>
          </View>
        )}

        {state === 'earlyExit' && (
          <View style={[styles.content, { marginBottom: kbOverlap }]}>
            <Text style={styles.doneLabel}>END CIRCUIT</Text>
            <Text style={styles.subtitle}>
              How many touches did you get before stopping?
            </Text>
            <TextInput
              style={styles.scoreInput}
              placeholder='Touches'
              placeholderTextColor='#B0BEC5'
              keyboardType='number-pad'
              maxLength={5}
              value={earlyTouchesInput}
              onChangeText={setEarlyTouchesInput}
              autoFocus
            />
            <TouchableOpacity
              style={[styles.startButton, (!earlyTouchesInput || saving) && styles.buttonDisabled]}
              onPress={handleSubmitEarlyTouches}
              disabled={!earlyTouchesInput || saving}
              activeOpacity={0.85}
            >
              <Text style={styles.startButtonText}>{saving ? 'Saving…' : 'Log & Exit'}</Text>
            </TouchableOpacity>
          </View>
        )}

        {state === 'done' && (
          <View style={styles.content}>
            <Text style={styles.doneLabel}>CIRCUIT COMPLETE</Text>
            <Text style={styles.doneTouches}>
              {saving ? 'Saving…' : `+${loggedTouches.toLocaleString()} touches logged`}
            </Text>
            <Text style={styles.doneSubtext}>Nice work — come back and run it again anytime.</Text>
            <TouchableOpacity style={styles.doneButton} onPress={handleClose} activeOpacity={0.8}>
              <Text style={styles.doneButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>

      {videoStep && (
        <DrillVideoModal
          visible={!!videoStep}
          onClose={() => setVideoStep(null)}
          videoUrl={videoStep.videoUrl}
          drillName={videoStep.drillName}
        />
      )}
    </>
  );
};

export default CircuitRunnerModal;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  closeButton: {
    position: 'absolute',
    right: 20,
    zIndex: 1,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#1f89ee',
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  title: {
    fontSize: 26,
    fontWeight: '900',
    color: '#1a1a2e',
    marginBottom: 24,
    textAlign: 'center',
  },
  stationsList: {
    width: '100%',
    gap: 10,
    marginBottom: 24,
  },
  stationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  stationNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stationNumberText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1f89ee',
  },
  stationLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#1a1a2e',
  },
  stationSeconds: {
    fontSize: 13,
    fontWeight: '700',
    color: '#78909C',
  },
  touchEstimate: {
    fontSize: 13,
    fontWeight: '600',
    color: '#78909C',
    marginBottom: 24,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#78909C',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  scoreInput: {
    width: '100%',
    fontSize: 32,
    fontWeight: '800',
    color: '#1a1a2e',
    textAlign: 'center',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 14,
    paddingVertical: 14,
    marginBottom: 24,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#1f89ee',
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 40,
    shadowColor: '#1f89ee',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  startButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  runningRound: {
    fontSize: 15,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 12,
  },
  runningLabel: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFF',
    textAlign: 'center',
    marginBottom: 24,
  },
  runningTime: {
    fontSize: 80,
    fontWeight: '900',
    color: '#FFF',
    letterSpacing: -2,
    marginBottom: 32,
  },
  pauseButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#31af4d',
    letterSpacing: 1.2,
    marginBottom: 12,
  },
  doneTouches: {
    fontSize: 20,
    fontWeight: '900',
    color: '#31af4d',
    marginBottom: 12,
  },
  doneSubtext: {
    fontSize: 15,
    fontWeight: '600',
    color: '#78909C',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
    paddingHorizontal: 16,
  },
  doneButton: {
    backgroundColor: '#1a1a2e',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 48,
    alignItems: 'center',
  },
  doneButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
});
