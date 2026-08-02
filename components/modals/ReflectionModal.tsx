import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

export type SessionFocus = 'match_pace' | 'technical_mastery' | 'light_recovery';

// Above this, kids tend to log the same big session repeatedly and start
// mindlessly tapping the top option — rotate the question to keep them honest.
const HIGH_VOLUME_THRESHOLD = 1000;

interface ReflectionOption {
  focus: SessionFocus;
  label: string;
  sublabel?: string;
}

interface ReflectionPrompt {
  title: string;
  options: ReflectionOption[];
}

const PROMPT_VARIANTS: ReflectionPrompt[] = [
  {
    title: 'Was this session at full game speed?',
    options: [
      { focus: 'match_pace', label: 'Match Pace', sublabel: 'Game Speed' },
      { focus: 'technical_mastery', label: 'Technical Mastery', sublabel: 'Skill Focus' },
      { focus: 'light_recovery', label: 'Light / Recovery' },
    ],
  },
  {
    title: 'Did you explode with acceleration after your turns today?',
    options: [
      { focus: 'match_pace', label: 'YES!' },
      { focus: 'technical_mastery', label: 'Working on it' },
    ],
  },
  {
    title: 'How many times did you check your shoulder / scan?',
    options: [
      { focus: 'match_pace', label: 'Every rep' },
      { focus: 'technical_mastery', label: 'A few times' },
      { focus: 'light_recovery', label: 'Focused on feet' },
    ],
  },
  {
    title: 'Be honest: could a defender have tackled you at that pace?',
    options: [
      { focus: 'match_pace', label: 'No way!' },
      { focus: 'technical_mastery', label: 'Maybe a few times' },
    ],
  },
];

interface ReflectionModalProps {
  visible: boolean;
  touches?: number;
  onSelect: (focus: SessionFocus) => void;
}

const ReflectionModal = ({ visible, touches = 0, onSelect }: ReflectionModalProps) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const lastVariantIndexRef = useRef<number | null>(null);
  const [promptIndex, setPromptIndex] = useState(0);

  useEffect(() => {
    if (visible) {
      if (touches > HIGH_VOLUME_THRESHOLD) {
        let idx = Math.floor(Math.random() * PROMPT_VARIANTS.length);
        if (PROMPT_VARIANTS.length > 1 && idx === lastVariantIndexRef.current) {
          idx = (idx + 1) % PROMPT_VARIANTS.length;
        }
        lastVariantIndexRef.current = idx;
        setPromptIndex(idx);
      } else {
        setPromptIndex(0);
      }

      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }).start();
    } else {
      scaleAnim.setValue(0);
    }
  }, [visible, touches, scaleAnim]);

  const prompt = PROMPT_VARIANTS[promptIndex];

  return (
    <Modal visible={visible} animationType='fade' transparent={true} hardwareAccelerated>
      <View style={styles.overlay}>
        <Animated.View style={[styles.card, { transform: [{ scale: scaleAnim }] }]}>
          <Text style={styles.title}>{prompt.title}</Text>
          <View style={styles.options}>
            {prompt.options.map((option) => (
              <TouchableOpacity
                key={option.focus + option.label}
                style={styles.option}
                onPress={() => onSelect(option.focus)}
                activeOpacity={0.85}
              >
                <Text style={styles.optionLabel}>{option.label}</Text>
                {!!option.sublabel && (
                  <Text style={styles.optionSublabel}>{option.sublabel}</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

export default ReflectionModal;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 28,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
  },
  title: {
    fontSize: 17,
    fontWeight: '900',
    color: '#1a1a2e',
    textAlign: 'center',
    lineHeight: 25,
    marginBottom: 20,
  },
  options: {
    width: '100%',
    gap: 10,
  },
  option: {
    backgroundColor: '#F5F7FA',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 20,
    width: '100%',
    alignItems: 'center',
  },
  optionLabel: {
    fontSize: 16,
    fontWeight: '900',
    color: '#1f89ee',
  },
  optionSublabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#78909C',
    marginTop: 2,
  },
});
