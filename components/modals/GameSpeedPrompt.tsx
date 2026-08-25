import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';
import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export type SessionFocus = 'match_pace' | 'technical_mastery' | 'light_recovery';

const COUNTDOWN_BEEP = require('../../assets/audio/countdown-beep.wav');
const GO_SOUND = require('../../assets/audio/go.wav');

const FINISHER_SECONDS = 30;

interface FocusOption {
  focus: SessionFocus;
  label: string;
  sublabel: string;
  bonus?: string;
}

const OPTIONS: FocusOption[] = [
  {
    focus: 'match_pace',
    label: '🔥 Match Pace',
    sublabel: '100% Speed',
    bonus: 'Earns 🔥 Flame Badge on Activity Feed',
  },
  { focus: 'technical_mastery', label: '🧠 Learning a New Skill', sublabel: '70% Speed' },
  { focus: 'light_recovery', label: '🔋 Warmup / Easy Touches', sublabel: 'Light day' },
];

interface GameSpeedPromptProps {
  onSelect: (focus: SessionFocus) => void;
}

type Step = 'choose' | 'finisher-offer' | 'finisher-timer';

// Rendered inline (no Modal wrapper) so it can sit as the first step inside
// whichever native Modal is already open — RN can't show two Modals at once.
const GameSpeedPrompt = ({ onSelect }: GameSpeedPromptProps) => {
  const [step, setStep] = useState<Step>('choose');
  const [pressedFocus, setPressedFocus] = useState<SessionFocus | null>(null);
  const [pendingFocus, setPendingFocus] = useState<SessionFocus | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(FINISHER_SECONDS);

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

  useEffect(() => {
    if (step !== 'finisher-timer') return;
    const interval = setInterval(() => {
      setSecondsLeft((s) => {
        const next = s - 1;
        if (next > 0 && next <= 3) {
          beepSoundRef.current?.replayAsync();
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        if (next <= 0) {
          clearInterval(interval);
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [step]);

  // Fires the upgrade to the parent from its own effect, not from inside the
  // setSecondsLeft updater above — calling a parent's setState synchronously
  // during another component's state update triggers React's
  // "Cannot update a component while rendering a different component" error.
  useEffect(() => {
    if (step !== 'finisher-timer' || secondsLeft > 0) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onSelect('match_pace');
  }, [step, secondsLeft, onSelect]);

  const handleOptionPress = (focus: SessionFocus) => {
    setPressedFocus(focus);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setTimeout(() => {
      if (focus === 'match_pace') {
        onSelect(focus);
      } else {
        setPendingFocus(focus);
        setStep('finisher-offer');
      }
    }, 180);
  };

  const startFinisher = () => {
    setSecondsLeft(FINISHER_SECONDS);
    goSoundRef.current?.replayAsync();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setStep('finisher-timer');
  };

  if (step === 'finisher-offer') {
    return (
      <View style={styles.container}>
        <Text style={styles.finisherTitle}>Want to earn the Match Pace Flame?</Text>
        <Text style={styles.finisherBody}>
          Complete a 30-second all-out sprint set right now to upgrade this session!
        </Text>
        <TouchableOpacity style={styles.finisherPrimary} onPress={startFinisher} activeOpacity={0.85}>
          <Text style={styles.finisherPrimaryText}>⏱️ Do 30s Finisher</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.finisherSecondary}
          onPress={() => pendingFocus && onSelect(pendingFocus)}
          activeOpacity={0.7}
        >
          <Text style={styles.finisherSecondaryText}>Skip & Log Session</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (step === 'finisher-timer') {
    return (
      <View style={styles.container}>
        <Text style={styles.timerLabel}>ALL-OUT SPRINT</Text>
        <Text style={styles.timerCount}>{secondsLeft}</Text>
        <Text style={styles.timerHint}>Go as hard as you can!</Text>
        <TouchableOpacity
          style={styles.timerCancel}
          onPress={() => setStep('finisher-offer')}
          activeOpacity={0.7}
        >
          <Text style={styles.timerCancelText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Was this session at full game speed?</Text>
      <View style={styles.options}>
        {OPTIONS.map((option) => {
          const selected = pressedFocus === option.focus;
          return (
            <TouchableOpacity
              key={option.focus}
              style={[styles.option, selected && styles.optionSelected]}
              onPress={() => handleOptionPress(option.focus)}
              activeOpacity={0.85}
              disabled={pressedFocus != null}
            >
              {selected && (
                <View style={styles.checkmark}>
                  <Ionicons name='checkmark-circle' size={20} color='#1f89ee' />
                </View>
              )}
              <Text style={styles.optionLabel}>{option.label}</Text>
              <Text style={styles.optionSublabel}>{option.sublabel}</Text>
              {option.bonus && <Text style={styles.optionBonus}>{option.bonus}</Text>}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

export default GameSpeedPrompt;

const styles = StyleSheet.create({
  container: { alignItems: 'center', paddingTop: 8 },
  title: {
    fontSize: 19,
    fontWeight: '900',
    color: '#1a1a2e',
    textAlign: 'center',
    lineHeight: 27,
    marginBottom: 24,
  },
  options: { width: '100%', gap: 10 },
  option: {
    backgroundColor: '#F5F7FA',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 20,
    width: '100%',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  optionSelected: {
    borderColor: '#1f89ee',
    backgroundColor: '#EAF4FE',
  },
  checkmark: {
    position: 'absolute',
    top: 10,
    right: 10,
  },
  optionLabel: {
    fontSize: 17,
    fontWeight: '900',
    color: '#1f89ee',
  },
  optionSublabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4A5568',
    marginTop: 3,
  },
  optionBonus: {
    fontSize: 12,
    fontWeight: '800',
    color: '#B23B00',
    marginTop: 6,
    textAlign: 'center',
  },
  finisherTitle: {
    fontSize: 19,
    fontWeight: '900',
    color: '#1a1a2e',
    textAlign: 'center',
    lineHeight: 27,
    marginBottom: 10,
  },
  finisherBody: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4A5568',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  finisherPrimary: {
    backgroundColor: '#1f89ee',
    borderRadius: 14,
    paddingVertical: 16,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#1f89ee',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  finisherPrimaryText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '900',
  },
  finisherSecondary: {
    paddingVertical: 14,
    width: '100%',
    alignItems: 'center',
  },
  finisherSecondaryText: {
    color: '#4A5568',
    fontSize: 14,
    fontWeight: '700',
  },
  timerLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: '#78909C',
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  timerCount: {
    fontSize: 72,
    fontWeight: '900',
    color: '#1f89ee',
    fontVariant: ['tabular-nums'],
  },
  timerHint: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4A5568',
    marginTop: 8,
    marginBottom: 20,
  },
  timerCancel: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  timerCancelText: {
    color: '#78909C',
    fontSize: 13,
    fontWeight: '700',
  },
});
