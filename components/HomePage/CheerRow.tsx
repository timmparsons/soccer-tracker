import { REACTION_EMOJI, REACTION_TYPES, setReaction, type CheerData, type ReactionType } from '@/hooks/useFeedCheers';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import {
  Modal,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';

interface CheerRowProps {
  feedItemKey: string;
  recipientId: string;
  userId: string;
  cheerData: CheerData | undefined;
  myReaction: ReactionType | undefined;
  disabled?: boolean;
  label?: string;
  containerStyle?: StyleProp<ViewStyle>;
}

export default function CheerRow({
  feedItemKey,
  recipientId,
  userId,
  cheerData,
  myReaction,
  disabled,
  label,
  containerStyle,
}: CheerRowProps) {
  const queryClient = useQueryClient();
  const [localReaction, setLocalReaction] = useState<ReactionType | null | undefined>(undefined);
  const [localCounts, setLocalCounts] = useState<Record<ReactionType, number> | null>(null);
  const [showSheet, setShowSheet] = useState(false);
  const [showPicker, setShowPicker] = useState(false);

  const effectiveReaction = localReaction !== undefined ? localReaction : myReaction ?? null;
  const baseCounts = cheerData?.counts;
  const effectiveCounts = localCounts ?? baseCounts;
  const totalCount = effectiveCounts ? REACTION_TYPES.reduce((sum, t) => sum + (effectiveCounts[t] ?? 0), 0) : 0;

  const applyReaction = async (reactionType: ReactionType) => {
    const prevReaction = effectiveReaction;
    const nowActive = prevReaction === reactionType ? null : reactionType;

    const nextCounts: Record<ReactionType, number> = {
      cheer: baseCounts?.cheer ?? 0,
      fire: baseCounts?.fire ?? 0,
      fireworks: baseCounts?.fireworks ?? 0,
      strong: baseCounts?.strong ?? 0,
    };
    if (prevReaction) nextCounts[prevReaction] = Math.max(0, nextCounts[prevReaction] - 1);
    if (nowActive) nextCounts[nowActive] = nextCounts[nowActive] + 1;

    setLocalReaction(nowActive);
    setLocalCounts(nextCounts);
    setShowPicker(false);

    await setReaction({
      feedItemKey,
      cheeredByUserId: userId,
      recipientUserId: recipientId,
      reactionType,
      currentReactionType: prevReaction ?? undefined,
      queryClient,
    });
  };

  const handlePress = () => {
    if (disabled) return;
    applyReaction(effectiveReaction ?? 'cheer');
  };

  const handleLongPress = () => {
    if (disabled) return;
    setShowPicker(true);
  };

  return (
    <View style={[styles.row, containerStyle]}>
      <View>
        <TouchableOpacity
          onPress={handlePress}
          onLongPress={handleLongPress}
          delayLongPress={280}
          style={[styles.cheerBtn, effectiveReaction && styles.cheerBtnActive, disabled && styles.cheerBtnDisabled]}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          activeOpacity={disabled ? 1 : 0.7}
          disabled={disabled}
        >
          <Text style={[styles.cheerBtnText, effectiveReaction && styles.cheerBtnTextActive]}>
            {REACTION_EMOJI[effectiveReaction ?? 'cheer']}
          </Text>
          {label && (
            <Text style={[styles.cheerBtnLabel, effectiveReaction && styles.cheerBtnTextActive]}>
              {label}
            </Text>
          )}
        </TouchableOpacity>

        {showPicker && (
          <>
            <Pressable style={styles.pickerDismiss} onPress={() => setShowPicker(false)} />
            <View style={styles.picker}>
              {REACTION_TYPES.map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[styles.pickerOption, effectiveReaction === type && styles.pickerOptionActive]}
                  onPress={() => applyReaction(type)}
                  hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                >
                  <Text style={styles.pickerEmoji}>{REACTION_EMOJI[type]}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}
      </View>

      {totalCount > 0 && (
        <TouchableOpacity onPress={() => setShowSheet(true)} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
          <Text style={styles.countText}>
            {REACTION_TYPES.filter((t) => (effectiveCounts?.[t] ?? 0) > 0)
              .map((t) => `${REACTION_EMOJI[t]} ${effectiveCounts![t]}`)
              .join('  ')}
          </Text>
        </TouchableOpacity>
      )}

      <Modal visible={showSheet} transparent animationType='slide' onRequestClose={() => setShowSheet(false)}>
        <Pressable style={styles.overlay} onPress={() => setShowSheet(false)}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            <View style={styles.handle} />
            <Text style={styles.sheetTitle}>Reactions</Text>
            {(cheerData?.reactors ?? []).map((r, i) => (
              <View key={i} style={styles.sheetRow}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{r.name.charAt(0).toUpperCase()}</Text>
                </View>
                <Text style={styles.sheetName}>{r.name}</Text>
                <Text style={styles.sheetEmoji}>{REACTION_EMOJI[r.reactionType]}</Text>
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
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
  cheerBtnLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#78909C',
  },
  countText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#78909C',
  },
  pickerDismiss: {
    position: 'absolute',
    top: -1000,
    left: -1000,
    right: -1000,
    bottom: -1000,
  },
  picker: {
    position: 'absolute',
    bottom: '100%',
    left: 0,
    marginBottom: 8,
    flexDirection: 'row',
    gap: 4,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingVertical: 6,
    paddingHorizontal: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 10,
    elevation: 6,
    zIndex: 10,
  },
  pickerOption: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerOptionActive: {
    backgroundColor: '#EFF6FF',
  },
  pickerEmoji: {
    fontSize: 20,
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
  sheetEmoji: {
    fontSize: 18,
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
