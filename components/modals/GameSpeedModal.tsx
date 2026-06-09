import { supabase } from '@/lib/supabase';
import { getLocalDate } from '@/utils/getLocalDate';
import React, { useEffect, useRef, useState } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Step = 'pick' | 'countdown' | 'entry' | 'results';

const DURATIONS = [
  { label: '1 min', minutes: 1 },
  { label: '2 min', minutes: 2 },
  { label: '3 min', minutes: 3 },
];

interface Props {
  visible: boolean;
  userId: string;
  onClose: () => void;
}

export default function GameSpeedModal({ visible, userId, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<Step>('pick');
  const [selectedMinutes, setSelectedMinutes] = useState(1);
  const [secondsLeft, setSecondsLeft] = useState(60);
  const [completedFull, setCompletedFull] = useState(false);
  const [touchInput, setTouchInput] = useState('');
  const [savedTouches, setSavedTouches] = useState(0);
  const [pb, setPb] = useState<number | null>(null);
  const [isNewPb, setIsNewPb] = useState(false);
  const [saving, setSaving] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const reset = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setStep('pick');
    setTouchInput('');
    setCompletedFull(false);
    setSavedTouches(0);
    setPb(null);
    setIsNewPb(false);
    setSaving(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  useEffect(() => {
    if (!visible) reset();
  }, [visible]);

  const startCountdown = () => {
    const total = selectedMinutes * 60;
    setSecondsLeft(total);
    setCompletedFull(false);
    setStep('countdown');
    timerRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          setCompletedFull(true);
          setStep('entry');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const stopEarly = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setCompletedFull(false);
    setStep('entry');
  };

  const handleSave = async () => {
    const count = parseInt(touchInput, 10);
    if (!count || count <= 0 || saving) return;
    setSaving(true);
    Keyboard.dismiss();

    // Query PB for this duration (only relevant if they finished the full time)
    let currentPb: number | null = null;
    if (completedFull) {
      const { data } = await supabase
        .from('daily_sessions')
        .select('touches_logged')
        .eq('user_id', userId)
        .eq('duration_minutes', selectedMinutes)
        .not('touches_logged', 'is', null)
        .order('touches_logged', { ascending: false })
        .limit(1)
        .maybeSingle();
      currentPb = (data as { touches_logged: number } | null)?.touches_logged ?? null;
    }

    await supabase.from('daily_sessions').insert({
      user_id: userId,
      touches_logged: count,
      duration_minutes: completedFull ? selectedMinutes : null,
      date: getLocalDate(),
    });

    if (completedFull) {
      const newPb = currentPb == null || count > currentPb;
      setSavedTouches(count);
      setPb(newPb ? count : currentPb);
      setIsNewPb(newPb);
    } else {
      setSavedTouches(count);
    }

    setSaving(false);
    setStep('results');
  };

  const formatCountdown = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  const pct = secondsLeft / (selectedMinutes * 60);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[styles.container, { paddingBottom: insets.bottom + 24 }]}>

          {/* PICK DURATION */}
          {step === 'pick' && (
            <View style={styles.content}>
              <Text style={styles.title}>Game Speed Dribble</Text>
              <Text style={styles.subtitle}>
                Dribble at full game speed. Count every realistic touch you make.
              </Text>
              <Text style={styles.sectionLabel}>Duration</Text>
              <View style={styles.durationRow}>
                {DURATIONS.map((d) => (
                  <Pressable
                    key={d.minutes}
                    style={[styles.durationBtn, selectedMinutes === d.minutes && styles.durationBtnActive]}
                    onPress={() => setSelectedMinutes(d.minutes)}
                  >
                    <Text style={[styles.durationLabel, selectedMinutes === d.minutes && styles.durationLabelActive]}>
                      {d.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <Pressable style={styles.primaryBtn} onPress={startCountdown}>
                <Text style={styles.primaryBtnText}>START</Text>
              </Pressable>
              <Pressable style={styles.ghostBtn} onPress={handleClose}>
                <Text style={styles.ghostBtnText}>Cancel</Text>
              </Pressable>
            </View>
          )}

          {/* COUNTDOWN */}
          {step === 'countdown' && (
            <View style={styles.timerContent}>
              <Text style={styles.timerEyebrow}>GAME SPEED DRIBBLE</Text>
              <Text style={styles.timerDisplay}>{formatCountdown(secondsLeft)}</Text>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${pct * 100}%` as any }]} />
              </View>
              <Text style={styles.timerHint}>Count every touch as you dribble</Text>
              <Pressable style={styles.stopBtn} onPress={stopEarly}>
                <Text style={styles.stopBtnText}>STOP EARLY</Text>
              </Pressable>
            </View>
          )}

          {/* TOUCH ENTRY */}
          {step === 'entry' && (
            <View style={styles.content}>
              <Text style={styles.title}>{completedFull ? "Time's up!" : 'Stopped early'}</Text>
              <Text style={styles.subtitle}>How many touches did you make?</Text>
              <TextInput
                style={styles.touchInput}
                value={touchInput}
                onChangeText={setTouchInput}
                keyboardType="number-pad"
                placeholder="187"
                placeholderTextColor="#B0BEC5"
                autoFocus
                maxLength={4}
                textAlign="center"
              />
              <Pressable
                style={[styles.primaryBtn, (!touchInput || parseInt(touchInput) <= 0) && styles.primaryBtnDisabled]}
                onPress={handleSave}
                disabled={!touchInput || parseInt(touchInput) <= 0 || saving}
              >
                <Text style={styles.primaryBtnText}>{saving ? 'Saving...' : 'SAVE'}</Text>
              </Pressable>
            </View>
          )}

          {/* RESULTS */}
          {step === 'results' && (
            <View style={styles.content}>
              {completedFull && isNewPb && (
                <View style={styles.pbBanner}>
                  <Text style={styles.pbBannerText}>NEW PERSONAL BEST</Text>
                </View>
              )}
              <Text style={styles.resultCount}>{savedTouches}</Text>
              <Text style={styles.resultLabel}>
                touches{completedFull ? ` in ${selectedMinutes} ${selectedMinutes === 1 ? 'minute' : 'minutes'}` : ''}
              </Text>
              {completedFull && pb != null && !isNewPb && (
                <Text style={styles.resultPb}>Your best: {pb} touches</Text>
              )}
              <Pressable style={styles.primaryBtn} onPress={() => { setTouchInput(''); setStep('pick'); }}>
                <Text style={styles.primaryBtnText}>GO AGAIN</Text>
              </Pressable>
              <Pressable style={styles.ghostBtn} onPress={handleClose}>
                <Text style={styles.ghostBtnText}>Done</Text>
              </Pressable>
            </View>
          )}

        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  content: {
    flex: 1,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: '#1a1a2e',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#78909C',
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 280,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#78909C',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 8,
  },
  durationRow: {
    flexDirection: 'row',
    gap: 12,
  },
  durationBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    backgroundColor: '#FFF',
  },
  durationBtnActive: {
    borderColor: '#1f89ee',
    backgroundColor: '#EBF4FF',
  },
  durationLabel: {
    fontSize: 16,
    fontWeight: '800',
    color: '#78909C',
  },
  durationLabelActive: {
    color: '#1f89ee',
  },
  primaryBtn: {
    width: '100%',
    backgroundColor: '#1f89ee',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  primaryBtnDisabled: {
    backgroundColor: '#B0BEC5',
  },
  primaryBtnText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FFF',
    letterSpacing: 0.5,
  },
  ghostBtn: {
    paddingVertical: 12,
  },
  ghostBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#78909C',
  },

  // COUNTDOWN
  timerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 16,
    backgroundColor: '#1a1a2e',
  },
  timerEyebrow: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffb724',
    letterSpacing: 1.5,
  },
  timerDisplay: {
    fontSize: 88,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -2,
    lineHeight: 96,
  },
  progressTrack: {
    width: '100%',
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: 6,
    backgroundColor: '#ffb724',
    borderRadius: 3,
  },
  timerHint: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
  },
  stopBtn: {
    marginTop: 16,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  stopBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: 0.5,
  },

  // TOUCH ENTRY
  touchInput: {
    fontSize: 56,
    fontWeight: '900',
    color: '#1a1a2e',
    width: '100%',
    textAlign: 'center',
    paddingVertical: 8,
    borderBottomWidth: 3,
    borderBottomColor: '#1f89ee',
  },

  // RESULTS
  pbBanner: {
    backgroundColor: '#31af4d',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  pbBannerText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#FFF',
    letterSpacing: 0.5,
  },
  resultCount: {
    fontSize: 80,
    fontWeight: '900',
    color: '#1a1a2e',
    lineHeight: 88,
  },
  resultLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: '#78909C',
  },
  resultPb: {
    fontSize: 14,
    fontWeight: '600',
    color: '#B0BEC5',
  },
});
