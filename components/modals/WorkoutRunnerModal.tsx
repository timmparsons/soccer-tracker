import DrillVideoModal from '@/components/modals/DrillVideoModal';
import { calculateChallengeTouches, DailyChallengeStep, logChallengeSession } from '@/hooks/useDailyChallenge';
import { useKeepAwakeWhen } from '@/hooks/useKeepAwakeWhen';
import { getTodayTouchTotal, MAX_DAILY_TOUCHES } from '@/lib/touchLimits';
import { getLocalDate } from '@/utils/getLocalDate';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface Props {
  visible: boolean;
  onClose: () => void;
  workout: { id: string; title: string };
  steps: DailyChallengeStep[];
  profileId: string;
  onCompleted: (timeSeconds: number) => void;
}

type ModalState = 'ready' | 'running' | 'done';

async function creditedTouches(userId: string, rawTouches: number): Promise<number> {
  const todayTotal = await getTodayTouchTotal(userId, getLocalDate());
  return Math.max(0, Math.min(rawTouches, MAX_DAILY_TOUCHES - todayTotal));
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = String(seconds % 60).padStart(2, '0');
  return `${m}:${s}`;
}

const WorkoutRunnerModal = ({ visible, onClose, workout, steps, profileId, onCompleted }: Props) => {
  const [state, setState] = useState<ModalState>('ready');
  useKeepAwakeWhen(visible && state === 'running', 'workout');
  const [displaySeconds, setDisplaySeconds] = useState(0);
  const startTimeRef = useRef<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [saving, setSaving] = useState(false);
  const [videoStep, setVideoStep] = useState<{ drillName: string; videoUrl: string } | null>(null);
  const [loggedTouches, setLoggedTouches] = useState(0);
  const estimatedTouches = calculateChallengeTouches(steps);
  const drillId = steps.length === 1 && steps[0].type === 'single' ? steps[0].drillId : undefined;
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!visible) {
      setState('ready');
      setDisplaySeconds(0);
      if (intervalRef.current) clearInterval(intervalRef.current);
      startTimeRef.current = null;
    }
  }, [visible]);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const handleStart = () => {
    startTimeRef.current = Date.now();
    intervalRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTimeRef.current!) / 1000);
      setDisplaySeconds(elapsed);
    }, 200);
    setState('running');
  };

  const handleDone = async () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    const finalSeconds = Math.floor((Date.now() - startTimeRef.current!) / 1000);
    setDisplaySeconds(finalSeconds);
    setSaving(true);
    try {
      const credited = await creditedTouches(profileId, calculateChallengeTouches(steps));
      await logChallengeSession(profileId, credited, finalSeconds, drillId);
      setLoggedTouches(credited);
      onCompleted(finalSeconds);
    } catch {
      // Completion still shown even if save fails
    } finally {
      setSaving(false);
    }
    setState('done');
  };

  const renderStep = (step: DailyChallengeStep, i: number) => {
    if (step.type === 'single') {
      return (
        <View key={i} style={styles.stepRow}>
          <View style={styles.stepNumber}>
            <Text style={styles.stepNumberText}>{i + 1}</Text>
          </View>
          <View style={styles.comboContent}>
            <Text style={styles.stepText}>
              <Text style={styles.stepReps}>{step.reps}x </Text>
              {step.drillName}
            </Text>
            {step.note && <Text style={styles.stepNote}>{step.note}</Text>}
          </View>
          {step.videoUrl && (
            <TouchableOpacity
              style={styles.watchButton}
              onPress={() => setVideoStep({ drillName: step.drillName, videoUrl: step.videoUrl! })}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name='play-circle-outline' size={22} color='#1f89ee' />
            </TouchableOpacity>
          )}
        </View>
      );
    }

    // COMBO STEP
    return (
      <View key={i} style={styles.comboStepContainer}>
        <View style={styles.stepRow}>
          <View style={styles.stepNumber}>
            <Text style={styles.stepNumberText}>{i + 1}</Text>
          </View>
          <View style={styles.comboContent}>
            <Text style={styles.stepText}>
              <Text style={styles.stepReps}>{step.reps}x </Text>
              {step.comboName}
            </Text>
            <Text style={styles.comboSequence}>
              {step.drills.map((d) => d.drillName).join(' → ')}
            </Text>
            {step.drills.some((d) => d.videoUrl) && (
              <View style={styles.comboWatchRow}>
                {step.drills.filter((d) => d.videoUrl).map((d, di) => (
                  <TouchableOpacity
                    key={di}
                    style={styles.comboWatchButton}
                    onPress={() => setVideoStep({ drillName: d.drillName, videoUrl: d.videoUrl! })}
                  >
                    <Ionicons name='play-circle-outline' size={14} color='#1f89ee' />
                    <Text style={styles.comboWatchLabel}>{d.drillName.split(' ')[0]}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </View>
      </View>
    );
  };

  if (!visible) return null;

  const isDark = state === 'running';

  return (
    <>
      <View style={[styles.container, { backgroundColor: isDark ? '#1a1a2e' : '#FFFFFF' }]}>
        <TouchableOpacity
          style={[styles.closeButton, { top: insets.top + 12 }]}
          onPress={onClose}
          hitSlop={12}
        >
          <Ionicons name='close' size={28} color={isDark ? '#FFF' : '#78909C'} />
        </TouchableOpacity>

        {state === 'ready' && (
          <View style={styles.content}>
            <Text style={styles.sectionLabel}>WORKOUT</Text>
            <Text style={styles.title}>{workout.title}</Text>

            <View style={styles.gameSpeedBanner}>
              <Ionicons name='flash' size={14} color='#ffb724' />
              <Text style={styles.gameSpeedText}>All reps must be done at game speed</Text>
            </View>

            <View style={styles.stepsList}>
              {steps.map((step, i) => renderStep(step, i))}
            </View>

            <Text style={styles.touchEstimate}>≈ {estimatedTouches.toLocaleString()} touches</Text>

            <TouchableOpacity style={styles.startButton} onPress={handleStart} activeOpacity={0.85}>
              <Ionicons name='play' size={22} color='#FFF' />
              <Text style={styles.startButtonText}>Start</Text>
            </TouchableOpacity>
          </View>
        )}

        {state === 'running' && (
          <View style={styles.content}>
            <Text style={styles.runningLabel}>{workout.title}</Text>
            <Text style={styles.timerDisplay}>{formatTime(displaySeconds)}</Text>
            <Text style={styles.timerLabel}>Keep going!</Text>
            <TouchableOpacity
              style={[styles.doneButton, saving && styles.doneButtonDisabled]}
              onPress={handleDone}
              disabled={saving}
              activeOpacity={0.85}
            >
              <Text style={styles.doneButtonText}>{saving ? 'Saving...' : 'Done'}</Text>
            </TouchableOpacity>
          </View>
        )}

        {state === 'done' && (
          <View style={styles.content}>
            <Text style={styles.doneLabel}>WORKOUT COMPLETE</Text>
            <Text style={styles.doneTime}>{formatTime(displaySeconds)}</Text>
            <Text style={styles.doneTouches}>+{loggedTouches.toLocaleString()} touches logged</Text>
            <Text style={styles.doneSubtext}>Nice work — come back and run it again anytime.</Text>
            <TouchableOpacity style={styles.closeDoneButton} onPress={onClose} activeOpacity={0.8}>
              <Text style={styles.closeDoneButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

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

export default WorkoutRunnerModal;

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
    marginBottom: 20,
    textAlign: 'center',
  },
  gameSpeedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFF8E7',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 24,
    borderLeftWidth: 3,
    borderLeftColor: '#ffb724',
    width: '100%',
  },
  gameSpeedText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#B45309',
    flex: 1,
  },
  stepsList: {
    width: '100%',
    gap: 14,
    marginBottom: 24,
  },
  // SINGLE STEP
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  stepNumberText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1f89ee',
  },
  stepText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a2e',
    flex: 1,
  },
  stepReps: {
    fontWeight: '900',
    color: '#1f89ee',
  },
  stepNote: {
    fontSize: 12,
    fontWeight: '600',
    color: '#78909C',
    marginTop: 2,
  },
  watchButton: {
    marginLeft: 4,
  },
  // COMBO STEP
  comboStepContainer: {
    width: '100%',
    backgroundColor: '#F8FAFF',
    borderRadius: 14,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#1f89ee',
  },
  comboContent: {
    flex: 1,
    gap: 4,
  },
  comboSequence: {
    fontSize: 13,
    fontWeight: '600',
    color: '#78909C',
    lineHeight: 18,
  },
  comboWatchRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 6,
  },
  comboWatchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  comboWatchLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1f89ee',
  },
  touchEstimate: {
    fontSize: 13,
    fontWeight: '600',
    color: '#78909C',
    textAlign: 'center',
    marginBottom: 24,
  },
  // RUNNING
  runningLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 12,
    textAlign: 'center',
  },
  timerDisplay: {
    fontSize: 72,
    fontWeight: '900',
    color: '#FFF',
    letterSpacing: -2,
    marginBottom: 8,
  },
  timerLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 32,
  },
  // BUTTONS
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
  doneButton: {
    backgroundColor: '#31af4d',
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 40,
    alignItems: 'center',
    shadowColor: '#31af4d',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  doneButtonDisabled: {
    opacity: 0.6,
  },
  doneButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  // DONE STATE
  doneLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#31af4d',
    letterSpacing: 1.2,
    marginBottom: 12,
  },
  doneTime: {
    fontSize: 72,
    fontWeight: '900',
    color: '#31af4d',
    letterSpacing: -3,
    marginBottom: 12,
  },
  doneTouches: {
    fontSize: 16,
    fontWeight: '700',
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
  closeDoneButton: {
    backgroundColor: '#1a1a2e',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 48,
    alignItems: 'center',
  },
  closeDoneButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
});
