import { useSendChallenge } from '@/hooks/usePlayerChallenges';
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface ChallengeSetupModalProps {
  visible: boolean;
  onClose: () => void;
  challengerId: string;
  challengedId: string;
  challengedName: string;
  challengedPushToken?: string | null;
}

const TOUCH_PRESETS = [50, 100, 200, 500];
const TIME_OPTIONS = [
  { label: '24 hours', value: 24 },
  { label: '48 hours', value: 48 },
  { label: '72 hours', value: 72 },
];

export default function ChallengeSetupModal({
  visible,
  onClose,
  challengerId,
  challengedId,
  challengedName,
  challengedPushToken,
}: ChallengeSetupModalProps) {
  const insets = useSafeAreaInsets();
  const [selectedTouches, setSelectedTouches] = useState<number>(100);
  const [customTouches, setCustomTouches] = useState('');
  const [isCustom, setIsCustom] = useState(false);
  const [selectedHours, setSelectedHours] = useState(24);
  const { mutate: sendChallenge, isPending } = useSendChallenge();

  const touchesTarget = isCustom ? parseInt(customTouches, 10) || 0 : selectedTouches;
  const canSend = touchesTarget > 0 && touchesTarget <= 10000;

  const handleSend = () => {
    if (!canSend) return;
    sendChallenge(
      {
        challengerId,
        challengedId,
        touchesTarget,
        timeLimitHours: selectedHours,
        challengedPushToken: challengedPushToken ?? null,
      },
      {
        onSuccess: () => onClose(),
      },
    );
  };

  return (
    <Modal visible={visible} animationType='slide' transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps='handled'>
          {/* Handle */}
          <View style={styles.handle} />

          {/* Close */}
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Ionicons name='close' size={20} color='#6B7280' />
          </TouchableOpacity>

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.emoji}>⚔️</Text>
            <Text style={styles.title}>Challenge {challengedName}</Text>
            <Text style={styles.subtitle}>
              First to hit the target wins. Results hidden until both finish.
            </Text>
          </View>

          {/* Touch target */}
          <Text style={styles.sectionLabel}>How many touches?</Text>
          <View style={styles.presetRow}>
            {TOUCH_PRESETS.map((n) => (
              <TouchableOpacity
                key={n}
                style={[styles.preset, !isCustom && selectedTouches === n && styles.presetActive]}
                onPress={() => {
                  setIsCustom(false);
                  setSelectedTouches(n);
                }}
              >
                <Text
                  style={[
                    styles.presetText,
                    !isCustom && selectedTouches === n && styles.presetTextActive,
                  ]}
                >
                  {n}
                </Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={[styles.preset, isCustom && styles.presetActive]}
              onPress={() => setIsCustom(true)}
            >
              <Text style={[styles.presetText, isCustom && styles.presetTextActive]}>Custom</Text>
            </TouchableOpacity>
          </View>

          {isCustom && (
            <TextInput
              style={styles.customInput}
              value={customTouches}
              onChangeText={setCustomTouches}
              placeholder='Enter number of touches'
              keyboardType='number-pad'
              placeholderTextColor='#78909C'
              autoFocus
            />
          )}

          {/* Time window */}
          <Text style={styles.sectionLabel}>How long to complete?</Text>
          <View style={styles.timeRow}>
            {TIME_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[styles.timeOption, selectedHours === opt.value && styles.timeOptionActive]}
                onPress={() => setSelectedHours(opt.value)}
              >
                <Text
                  style={[
                    styles.timeOptionText,
                    selectedHours === opt.value && styles.timeOptionTextActive,
                  ]}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Accept window note */}
          <View style={styles.noteRow}>
            <Ionicons name='information-circle-outline' size={14} color='#78909C' />
            <Text style={styles.noteText}>
              {challengedName} has 24 hours to accept.
            </Text>
          </View>

          {/* Send button */}
          <TouchableOpacity
            style={[styles.sendButton, !canSend && styles.sendButtonDisabled]}
            onPress={handleSend}
            disabled={!canSend || isPending}
          >
            {isPending ? (
              <ActivityIndicator color='#FFF' />
            ) : (
              <Text style={styles.sendButtonText}>
                Send Challenge — {touchesTarget > 0 ? touchesTarget : '?'} touches in {selectedHours}h
              </Text>
            )}
          </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
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
    gap: 6,
  },
  emoji: {
    fontSize: 36,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: '#1a1a2e',
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#78909C',
    textAlign: 'center',
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1a1a2e',
    marginBottom: 10,
  },
  presetRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  preset: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
  },
  presetActive: {
    backgroundColor: '#1f89ee',
  },
  presetText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1a1a2e',
  },
  presetTextActive: {
    color: '#FFF',
  },
  customInput: {
    borderWidth: 1.5,
    borderColor: '#1f89ee',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a2e',
    marginBottom: 16,
  },
  timeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  timeOption: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },
  timeOptionActive: {
    backgroundColor: '#1a1a2e',
  },
  timeOptionText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1a1a2e',
  },
  timeOptionTextActive: {
    color: '#FFF',
  },
  noteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 20,
  },
  noteText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#78909C',
  },
  sendButton: {
    backgroundColor: '#1f89ee',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.4,
  },
  sendButtonText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#FFF',
  },
});
