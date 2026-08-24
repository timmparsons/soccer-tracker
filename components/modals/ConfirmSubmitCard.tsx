import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export const SUSPICIOUS_TOUCHES_PER_SEC = 8;

export function computePace(touches: number, elapsedSeconds: number | null | undefined) {
  if (!elapsedSeconds || elapsedSeconds <= 0) return null;
  return touches / elapsedSeconds;
}

interface ConfirmSubmitCardProps {
  touches: number;
  elapsedSeconds?: number | null;
  itemLabel?: string;
  title?: string;
  warningText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  submitting?: boolean;
}

const ConfirmSubmitCard = ({
  touches,
  elapsedSeconds,
  itemLabel = 'touches',
  title = 'Confirm your score',
  warningText,
  onConfirm,
  onCancel,
  submitting = false,
}: ConfirmSubmitCardProps) => {
  const pace = computePace(touches, elapsedSeconds);
  const suspicious = pace !== null && pace > SUSPICIOUS_TOUCHES_PER_SEC;

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.touchesValue}>{touches.toLocaleString()}</Text>
      <Text style={styles.touchesLabel}>{itemLabel}</Text>
      {elapsedSeconds != null && elapsedSeconds > 0 && (
        <Text style={styles.timeText}>in {elapsedSeconds.toFixed(0)}s</Text>
      )}

      {suspicious && pace != null && (
        <View style={styles.warningBanner}>
          <Ionicons name='alert-circle' size={18} color='#92400E' />
          <Text style={styles.warningText}>
            {warningText ??
              `That's ${pace.toFixed(1)} ${itemLabel}/sec — faster than looks realistic. Double-check your count before submitting.`}
          </Text>
        </View>
      )}

      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.cancelButton} onPress={onCancel} disabled={submitting}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.confirmButton, suspicious && styles.confirmButtonWarning]}
          onPress={onConfirm}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator size='small' color='#FFF' />
          ) : (
            <Text style={styles.confirmButtonText}>
              {suspicious ? "Yes, that's right" : 'Confirm'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default ConfirmSubmitCard;

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: '#78909C',
    marginBottom: 12,
  },
  touchesValue: {
    fontSize: 48,
    fontWeight: '900',
    color: '#1a1a2e',
  },
  touchesLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#78909C',
    marginTop: 2,
  },
  timeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#B0BEC5',
    marginTop: 4,
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#FFFBEB',
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#FDE68A',
    padding: 14,
    marginTop: 20,
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: '#92400E',
    lineHeight: 19,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
    width: '100%',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 14,
    backgroundColor: '#F5F7FA',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#78909C',
  },
  confirmButton: {
    flex: 2,
    paddingVertical: 16,
    borderRadius: 14,
    backgroundColor: '#1f89ee',
    alignItems: 'center',
  },
  confirmButtonWarning: {
    backgroundColor: '#F59E0B',
  },
  confirmButtonText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#FFF',
  },
});
