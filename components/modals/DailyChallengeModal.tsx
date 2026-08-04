import ConfirmSubmitCard from '@/components/modals/ConfirmSubmitCard';
import DrillVideoModal from '@/components/modals/DrillVideoModal';
import { calculateChallengeTouches, DailyChallengeStep, logChallengeSession, saveDailyChallengeCompletion } from '@/hooks/useDailyChallenge';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

interface Props {
  visible: boolean;
  onClose: () => void;
  challenge: { id: string; title: string };
  steps: DailyChallengeStep[];
  profileId: string;
  onCompleted: (timeSeconds: number) => void;
}

type ModalState = 'ready' | 'running' | 'confirm' | 'done';

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = String(seconds % 60).padStart(2, '0');
  return `${m}:${s}`;
}

const DailyChallengeModal = ({ visible, onClose, challenge, steps, profileId, onCompleted }: Props) => {
  const [state, setState] = useState<ModalState>('ready');
  const [displaySeconds, setDisplaySeconds] = useState(0);
  const startTimeRef = useRef<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [saving, setSaving] = useState(false);
  const [videoStep, setVideoStep] = useState<{ drillName: string; videoUrl: string } | null>(null);
  const estimatedTouches = calculateChallengeTouches(steps);

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

  const handleFinish = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    const finalSeconds = Math.floor((Date.now() - startTimeRef.current!) / 1000);
    setDisplaySeconds(finalSeconds);
    setState('confirm');
  };

  const handleResume = () => {
    intervalRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTimeRef.current!) / 1000);
      setDisplaySeconds(elapsed);
    }, 200);
    setState('running');
  };

  const handleConfirmSubmit = async () => {
    const finalSeconds = displaySeconds;
    setSaving(true);
    try {
      const touches = calculateChallengeTouches(steps);
      await Promise.all([
        saveDailyChallengeCompletion(challenge.id, profileId, finalSeconds),
        logChallengeSession(profileId, touches, finalSeconds),
      ]);
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

  return (
    <Modal visible={visible} transparent animationType='slide' onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={state === 'ready' ? onClose : undefined}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <View style={styles.handle} />

          {state === 'confirm' ? (
            // CONFIRM STATE
            <ConfirmSubmitCard
              touches={estimatedTouches}
              elapsedSeconds={displaySeconds}
              itemLabel='touches'
              title='Confirm your time'
              onConfirm={handleConfirmSubmit}
              onCancel={handleResume}
              submitting={saving}
            />
          ) : state === 'done' ? (
            // DONE STATE
            <View style={styles.doneContainer}>
              <Text style={styles.doneLabel}>CHALLENGE COMPLETE</Text>
              <Text style={styles.doneTime}>{formatTime(displaySeconds)}</Text>
              <Text style={styles.doneTouches}>+{estimatedTouches.toLocaleString()} touches logged</Text>
              <Text style={styles.doneSubtext}>Nice work — get out there and do it again tomorrow.</Text>
              <TouchableOpacity style={styles.closeButton} onPress={onClose} activeOpacity={0.8}>
                <Text style={styles.closeButtonText}>Done</Text>
              </TouchableOpacity>
            </View>
          ) : (
            // READY / RUNNING STATES
            <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
              <Text style={styles.sectionLabel}>TODAY&apos;S CHALLENGE</Text>
              <Text style={styles.title}>{challenge.title}</Text>

              <View style={styles.gameSpeedBanner}>
                <Ionicons name='flash' size={14} color='#ffb724' />
                <Text style={styles.gameSpeedText}>All reps must be done at game speed</Text>
              </View>

              <View style={styles.stepsList}>
                {steps.map((step, i) => renderStep(step, i))}
              </View>

              <Text style={styles.touchEstimate}>≈ {estimatedTouches.toLocaleString()} touches</Text>

              {state === 'running' && (
                <View style={styles.timerContainer}>
                  <Text style={styles.timerDisplay}>{formatTime(displaySeconds)}</Text>
                  <Text style={styles.timerLabel}>Keep going!</Text>
                </View>
              )}

              {state === 'ready' ? (
                <TouchableOpacity style={styles.startButton} onPress={handleStart} activeOpacity={0.8}>
                  <Text style={styles.startButtonText}>Start</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.doneButton}
                  onPress={handleFinish}
                  activeOpacity={0.8}
                >
                  <Text style={styles.doneButtonText}>Done</Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          )}
        </Pressable>
      </Pressable>

      {videoStep && (
        <DrillVideoModal
          visible={!!videoStep}
          onClose={() => setVideoStep(null)}
          videoUrl={videoStep.videoUrl}
          drillName={videoStep.drillName}
        />
      )}
    </Modal>
  );
};

export default DailyChallengeModal;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingBottom: 48,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E5E7EB',
    alignSelf: 'center',
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#1f89ee',
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    color: '#1a1a2e',
    marginBottom: 20,
  },
  gameSpeedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFF8E7',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 20,
    borderLeftWidth: 3,
    borderLeftColor: '#ffb724',
  },
  gameSpeedText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#B45309',
    flex: 1,
  },
  stepsList: {
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
    marginBottom: 16,
  },
  // TIMER
  timerContainer: {
    alignItems: 'center',
    paddingVertical: 20,
    marginBottom: 8,
  },
  timerDisplay: {
    fontSize: 64,
    fontWeight: '900',
    color: '#1a1a2e',
    letterSpacing: -2,
  },
  timerLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#78909C',
    marginTop: 4,
  },
  // BUTTONS
  startButton: {
    backgroundColor: '#1f89ee',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
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
    alignItems: 'center',
    shadowColor: '#31af4d',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  doneButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  // DONE STATE
  doneContainer: {
    alignItems: 'center',
    paddingVertical: 16,
  },
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
  closeButton: {
    backgroundColor: '#1a1a2e',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 48,
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
});
