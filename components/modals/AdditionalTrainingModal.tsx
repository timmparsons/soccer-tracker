import { awardAdditionalTrainingXp } from '@/lib/awardXp';
import { ADDITIONAL_TRAINING_DAILY_CAP, type AdditionalTrainingCategory } from '@/lib/xp';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

interface Props {
  visible: boolean;
  category: AdditionalTrainingCategory | null;
  userId: string;
  remainingCap: number;
  onClose: () => void;
  onComplete: (xpAwarded: number) => void;
}

export default function AdditionalTrainingModal({
  visible,
  category,
  userId,
  remainingCap,
  onClose,
  onComplete,
}: Props) {
  const [selectedDuration, setSelectedDuration] = useState<5 | 10 | 15>(10);
  const [submitting, setSubmitting] = useState(false);
  const [completedXp, setCompletedXp] = useState<number | null>(null);

  const handleClose = () => {
    setSelectedDuration(10);
    setCompletedXp(null);
    onClose();
  };

  const handleComplete = async () => {
    if (!category) return;
    setSubmitting(true);
    const { xpAwarded } = await awardAdditionalTrainingXp(userId, category.id, selectedDuration);
    setSubmitting(false);
    setCompletedXp(xpAwarded);
    onComplete(xpAwarded);
  };

  if (!category) return null;

  const selectedRate = category.xpRates.find((r) => r.duration === selectedDuration)!;
  const xpAfterCap = Math.min(selectedRate.xp, remainingCap);
  const capHit = remainingCap === 0;

  return (
    <Modal
      visible={visible}
      animationType='slide'
      transparent
      onRequestClose={handleClose}
    >
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={handleClose}>
        <TouchableOpacity activeOpacity={1} style={styles.sheet}>
          {completedXp !== null ? (
            <View style={styles.successContainer}>
              <Text style={styles.successEmoji}>⚡</Text>
              <Text style={styles.successTitle}>Training Complete</Text>
              <Text style={styles.successCategory}>{category.name}</Text>
              <Text style={styles.successDuration}>{selectedDuration} minutes</Text>
              {completedXp > 0 ? (
                <View style={styles.xpBadge}>
                  <Text style={styles.xpBadgeText}>+{completedXp} XP</Text>
                </View>
              ) : (
                <Text style={styles.capNote}>Daily cap reached — no XP earned</Text>
              )}
              <TouchableOpacity style={styles.doneButton} onPress={handleClose}>
                <Text style={styles.doneButtonText}>Done</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <View style={styles.header}>
                <View>
                  <Text style={styles.categoryName}>{category.name}</Text>
                  <Text style={styles.categoryDescription}>{category.description}</Text>
                </View>
                <TouchableOpacity onPress={handleClose} hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}>
                  <Ionicons name='close' size={22} color='#78909C' />
                </TouchableOpacity>
              </View>

              <Text style={styles.durationLabel}>Select duration</Text>
              <View style={styles.durationRow}>
                {category.xpRates.map(({ duration, xp }) => {
                  const effective = Math.min(xp, remainingCap);
                  const selected = selectedDuration === duration;
                  return (
                    <TouchableOpacity
                      key={duration}
                      style={[styles.durationOption, selected && styles.durationOptionSelected]}
                      onPress={() => setSelectedDuration(duration)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.durationMinutes, selected && styles.durationTextSelected]}>
                        {duration} min
                      </Text>
                      <Text style={[styles.durationXp, selected && styles.durationXpSelected]}>
                        +{effective} XP
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={styles.capRow}>
                <View style={styles.capBar}>
                  <View
                    style={[
                      styles.capFill,
                      {
                        width: `${Math.min(100, ((ADDITIONAL_TRAINING_DAILY_CAP - remainingCap) / ADDITIONAL_TRAINING_DAILY_CAP) * 100)}%`,
                      },
                    ]}
                  />
                </View>
                <Text style={styles.capText}>
                  {ADDITIONAL_TRAINING_DAILY_CAP - remainingCap} / {ADDITIONAL_TRAINING_DAILY_CAP} XP today
                </Text>
              </View>

              {capHit ? (
                <View style={styles.capWarning}>
                  <Ionicons name='information-circle-outline' size={16} color='#f97316' />
                  <Text style={styles.capWarningText}>Daily additional training cap reached</Text>
                </View>
              ) : xpAfterCap < selectedRate.xp ? (
                <View style={styles.capWarning}>
                  <Ionicons name='information-circle-outline' size={16} color='#f97316' />
                  <Text style={styles.capWarningText}>
                    Only {remainingCap} XP remaining before daily cap
                  </Text>
                </View>
              ) : null}

              <TouchableOpacity
                style={[styles.completeButton, capHit && styles.completeButtonDim]}
                onPress={handleComplete}
                disabled={submitting}
                activeOpacity={0.8}
              >
                {submitting ? (
                  <ActivityIndicator color='#FFF' />
                ) : (
                  <Text style={styles.completeButtonText}>
                    {capHit ? 'Log Training' : `Complete  +${xpAfterCap} XP`}
                  </Text>
                )}
              </TouchableOpacity>
            </>
          )}
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  categoryName: {
    fontSize: 20,
    fontWeight: '900',
    color: '#1a1a2e',
    marginBottom: 4,
  },
  categoryDescription: {
    fontSize: 14,
    fontWeight: '600',
    color: '#78909C',
  },
  durationLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: '#78909C',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  durationRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  durationOption: {
    flex: 1,
    borderRadius: 14,
    backgroundColor: '#F0F4F8',
    paddingVertical: 14,
    alignItems: 'center',
    gap: 4,
  },
  durationOptionSelected: {
    backgroundColor: '#1f89ee',
  },
  durationMinutes: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1a1a2e',
  },
  durationTextSelected: {
    color: '#FFF',
  },
  durationXp: {
    fontSize: 13,
    fontWeight: '700',
    color: '#78909C',
  },
  durationXpSelected: {
    color: 'rgba(255,255,255,0.85)',
  },
  capRow: {
    marginBottom: 12,
    gap: 6,
  },
  capBar: {
    height: 6,
    backgroundColor: '#F0F4F8',
    borderRadius: 3,
    overflow: 'hidden',
  },
  capFill: {
    height: '100%',
    backgroundColor: '#1f89ee',
    borderRadius: 3,
  },
  capText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#78909C',
  },
  capWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFF7ED',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 16,
  },
  capWarningText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#f97316',
    flex: 1,
  },
  completeButton: {
    backgroundColor: '#1f89ee',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  completeButtonDim: {
    backgroundColor: '#78909C',
  },
  completeButtonText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FFF',
  },
  successContainer: {
    alignItems: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  successEmoji: {
    fontSize: 48,
    marginBottom: 8,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#1a1a2e',
  },
  successCategory: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1f89ee',
  },
  successDuration: {
    fontSize: 14,
    fontWeight: '600',
    color: '#78909C',
    marginBottom: 8,
  },
  xpBadge: {
    backgroundColor: '#ffb724',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginBottom: 16,
  },
  xpBadgeText: {
    fontSize: 20,
    fontWeight: '900',
    color: '#FFF',
  },
  capNote: {
    fontSize: 14,
    fontWeight: '600',
    color: '#78909C',
    marginBottom: 16,
  },
  doneButton: {
    backgroundColor: '#1f89ee',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 48,
    marginTop: 8,
  },
  doneButtonText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FFF',
  },
});
