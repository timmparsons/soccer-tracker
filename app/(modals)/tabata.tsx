import CountdownView from '@/components/HomePage/ChallengeTimer/CountdownView';
import { useChallengeTimer } from '@/hooks/useChallengeTimer';
import { IntervalPhase, useIntervalTimer } from '@/hooks/useIntervalTimer';
import { useTabataSession } from '@/hooks/useTabataSession';
import { useUser } from '@/hooks/useUser';
import { supabase } from '@/lib/supabase';
import { track } from '@/lib/analytics';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  Vibration,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const ROUNDS = 8;
const WORK_SECONDS = 20;
const REST_SECONDS = 10;

function buildTabataPhases(): IntervalPhase[] {
  const phases: IntervalPhase[] = [];
  for (let i = 0; i < ROUNDS; i++) {
    phases.push({ label: 'WORK', seconds: WORK_SECONDS, cueSound: 'work' });
    phases.push({ label: 'REST', seconds: REST_SECONDS, cueSound: 'rest' });
  }
  return phases;
}
const PHASES = buildTabataPhases();

type RunnerState = 'ready' | 'countdown' | 'running' | 'scoreEntry' | 'results';

export default function TabataScreen() {
  const { data: user } = useUser();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const tabataSession = useTabataSession(user?.id);

  const [state, setState] = useState<RunnerState>('ready');
  const [repsInput, setRepsInput] = useState('');
  const [previousBest, setPreviousBest] = useState(0);
  const [touchesCredited, setTouchesCredited] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const roundsCompletedRef = useRef(0);
  const goSoundRef = useRef<Audio.Sound | null>(null);
  const beepSoundRef = useRef<Audio.Sound | null>(null);
  const whistleSoundRef = useRef<Audio.Sound | null>(null);

  useFocusEffect(
    useCallback(() => {
      track('tabata_viewed');
    }, []),
  );

  useEffect(() => {
    Audio.Sound.createAsync(require('@/assets/audio/go.wav')).then(({ sound }) => {
      goSoundRef.current = sound;
    });
    Audio.Sound.createAsync(require('@/assets/audio/countdown-beep.wav')).then(({ sound }) => {
      beepSoundRef.current = sound;
    });
    Audio.Sound.createAsync(require('@/assets/sounds/whistle.mp3')).then(({ sound }) => {
      whistleSoundRef.current = sound;
    });
    return () => {
      goSoundRef.current?.unloadAsync();
      beepSoundRef.current?.unloadAsync();
      whistleSoundRef.current?.unloadAsync();
    };
  }, []);

  useEffect(() => {
    if (!user?.id) return;
    (supabase as any)
      .from('tabata_results')
      .select('total_reps')
      .eq('user_id', user.id)
      .order('total_reps', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }: { data: { total_reps: number } | null }) => {
        setPreviousBest(data?.total_reps ?? 0);
      });
  }, [user?.id]);

  const finishSession = useCallback(() => {
    whistleSoundRef.current?.replayAsync();
    setState('scoreEntry');
  }, []);

  const handlePhaseChange = useCallback((phase: IntervalPhase) => {
    Vibration.vibrate(phase.cueSound === 'work' ? 150 : 80);
    if (phase.cueSound === 'rest') {
      roundsCompletedRef.current += 1;
      beepSoundRef.current?.replayAsync();
    } else {
      goSoundRef.current?.replayAsync();
    }
  }, []);

  const timer = useIntervalTimer(PHASES, {
    onPhaseChange: handlePhaseChange,
    onComplete: finishSession,
  });

  const preTimer = useChallengeTimer({
    personalBestMs: null,
    crownThresholdMs: Infinity,
    onGo: () => {
      setState('running');
      timer.start();
    },
  });

  const handleStart = () => {
    roundsCompletedRef.current = 0;
    setState('countdown');
    preTimer.start();
  };

  const handleStop = () => {
    timer.pause();
    finishSession();
  };

  const handleSubmitReps = async () => {
    const totalReps = parseInt(repsInput, 10);
    if (!totalReps || totalReps <= 0 || !user?.id) return;
    setSubmitting(true);
    try {
      const result = await tabataSession.mutateAsync({
        roundsCompleted: roundsCompletedRef.current,
        totalReps,
      });
      setTouchesCredited(result.touchesCredited);
      setState('results');
    } catch {
      // stay on score entry so the player can retry
    } finally {
      setSubmitting(false);
    }
  };

  const isDark = state === 'running' || state === 'countdown';
  const isPB = parseInt(repsInput, 10) > previousBest;

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#1a1a2e' : '#FFFFFF' }]}>
      <TouchableOpacity
        style={[styles.closeButton, { top: insets.top + 12 }]}
        onPress={() => router.back()}
        hitSlop={12}
      >
        <Ionicons name='close' size={28} color={isDark ? '#FFF' : '#78909C'} />
      </TouchableOpacity>

      {state === 'ready' && (
        <View style={styles.content}>
          <Text style={styles.sectionLabel}>BURST</Text>
          <Text style={styles.title}>4-Min Burst</Text>
          <Text style={styles.subtitle}>
            {ROUNDS} rounds. Go as fast as you can for {WORK_SECONDS}s and get as many touches
            as you can, then rest {REST_SECONDS}s.
          </Text>
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
            Round {Math.floor(timer.phaseIndex / 2) + 1} / {ROUNDS}
          </Text>
          <Text
            style={[
              styles.runningLabel,
              timer.currentPhase.cueSound === 'work' ? styles.workLabel : styles.restLabel,
            ]}
          >
            {timer.currentPhase.label}
          </Text>
          <Text style={styles.runningTime}>{timer.secondsRemaining}</Text>
          <TouchableOpacity style={styles.stopButton} onPress={handleStop}>
            <Text style={styles.stopButtonText}>Stop</Text>
          </TouchableOpacity>
        </View>
      )}

      {state === 'scoreEntry' && (
        <View style={styles.content}>
          <Text style={styles.doneLabel}>BURST COMPLETE</Text>
          <Text style={styles.subtitle}>
            {roundsCompletedRef.current} of {ROUNDS} rounds completed. How many total reps did
            you get?
          </Text>
          <TextInput
            style={styles.scoreInput}
            placeholder='Total reps'
            placeholderTextColor='#B0BEC5'
            keyboardType='number-pad'
            maxLength={4}
            value={repsInput}
            onChangeText={setRepsInput}
            autoFocus
          />
          <TouchableOpacity
            style={[styles.startButton, (!repsInput || submitting) && styles.buttonDisabled]}
            onPress={handleSubmitReps}
            disabled={!repsInput || submitting}
            activeOpacity={0.85}
          >
            <Text style={styles.startButtonText}>{submitting ? 'Saving…' : 'Save Score'}</Text>
          </TouchableOpacity>
        </View>
      )}

      {state === 'results' && (
        <View style={styles.content}>
          <Text style={styles.doneLabel}>{isPB ? 'NEW PB!' : 'RESULTS'}</Text>
          <Text style={styles.resultsReps}>{repsInput} reps</Text>
          <Text style={styles.doneTouches}>+{touchesCredited.toLocaleString()} touches logged</Text>
          <Text style={styles.subtitle}>{roundsCompletedRef.current} of {ROUNDS} rounds completed</Text>
          <TouchableOpacity style={styles.doneButton} onPress={() => router.back()} activeOpacity={0.8}>
            <Text style={styles.doneButtonText}>Done</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

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
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#78909C',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 28,
    paddingHorizontal: 8,
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
  buttonDisabled: {
    opacity: 0.5,
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
    marginBottom: 16,
  },
  runningLabel: {
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: 2,
    marginBottom: 16,
  },
  workLabel: {
    color: '#ffb724',
  },
  restLabel: {
    color: '#31af4d',
  },
  runningTime: {
    fontSize: 96,
    fontWeight: '900',
    color: '#FFF',
    letterSpacing: -2,
    marginBottom: 32,
  },
  stopButton: {
    paddingVertical: 10,
    paddingHorizontal: 24,
  },
  stopButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.7)',
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
  doneLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: '#31af4d',
    letterSpacing: 1.2,
    marginBottom: 12,
  },
  resultsReps: {
    fontSize: 56,
    fontWeight: '900',
    color: '#1a1a2e',
    letterSpacing: -2,
    marginBottom: 8,
  },
  doneTouches: {
    fontSize: 16,
    fontWeight: '700',
    color: '#78909C',
    marginBottom: 16,
  },
  doneButton: {
    backgroundColor: '#1a1a2e',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 48,
    alignItems: 'center',
    marginTop: 12,
  },
  doneButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
});
