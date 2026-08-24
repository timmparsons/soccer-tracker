import { toggleCheer, type CheerData } from '@/hooks/useFeedCheers';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

interface CheerRowProps {
  feedItemKey: string;
  recipientId: string;
  userId: string;
  cheerData: CheerData | undefined;
  alreadyCheered: boolean;
  disabled?: boolean;
}

export default function CheerRow({ feedItemKey, recipientId, userId, cheerData, alreadyCheered, disabled }: CheerRowProps) {
  const queryClient = useQueryClient();
  const [localOverride, setLocalOverride] = useState<boolean | null>(null);
  const [localCount, setLocalCount] = useState<number | null>(null);
  const [showSheet, setShowSheet] = useState(false);

  const effectiveCheered = localOverride !== null ? localOverride : alreadyCheered;
  const baseCount = cheerData?.count ?? 0;
  const effectiveCount = localCount !== null ? localCount : baseCount;

  const handleCheer = async () => {
    if (disabled || effectiveCheered) return;
    setLocalOverride(true);
    setLocalCount(effectiveCount + 1);
    await toggleCheer({
      feedItemKey,
      cheeredByUserId: userId,
      recipientUserId: recipientId,
      alreadyCheered: false,
      queryClient,
    });
  };

  return (
    <View style={styles.row}>
      <TouchableOpacity
        onPress={handleCheer}
        style={[styles.cheerBtn, effectiveCheered && styles.cheerBtnActive, disabled && styles.cheerBtnDisabled]}
        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
        activeOpacity={disabled ? 1 : 0.7}
        disabled={disabled}
      >
        <Text style={[styles.cheerBtnText, effectiveCheered && styles.cheerBtnTextActive]}>👏</Text>
      </TouchableOpacity>

      {effectiveCount > 0 && (
        <TouchableOpacity onPress={() => setShowSheet(true)} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
          <Text style={styles.countText}>{effectiveCount} {effectiveCount === 1 ? 'cheer' : 'cheers'}</Text>
        </TouchableOpacity>
      )}

      <Modal visible={showSheet} transparent animationType='slide' onRequestClose={() => setShowSheet(false)}>
        <Pressable style={styles.overlay} onPress={() => setShowSheet(false)}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            <View style={styles.handle} />
            <Text style={styles.sheetTitle}>Cheers</Text>
            {(cheerData?.names ?? []).map((name, i) => (
              <View key={i} style={styles.sheetRow}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{name.charAt(0).toUpperCase()}</Text>
                </View>
                <Text style={styles.sheetName}>{name}</Text>
              </View>
            ))}
            <TouchableOpacity style={styles.closeBtn} onPress={() => setShowSheet(false)}>
              <Text style={styles.closeBtnText}>Close</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingTop: 6,
    paddingBottom: 2,
  },
  cheerBtn: {
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#B0BEC5',
  },
  cheerBtnActive: {
    borderColor: '#1f89ee',
    backgroundColor: '#EFF6FF',
  },
  cheerBtnDisabled: {
    opacity: 0.4,
  },
  cheerBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#78909C',
  },
  cheerBtnTextActive: {
    color: '#1f89ee',
  },
  countText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#78909C',
  },
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
    paddingBottom: 40,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E5E7EB',
    alignSelf: 'center',
    marginBottom: 20,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#1a1a2e',
    marginBottom: 20,
  },
  sheetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F4F8',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#1f89ee',
  },
  sheetName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: '#1a1a2e',
  },
  closeBtn: {
    marginTop: 24,
    backgroundColor: '#1f89ee',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  closeBtnText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FFFFFF',
  },
});
