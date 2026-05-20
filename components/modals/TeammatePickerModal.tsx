import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export interface Teammate {
  id: string;
  name: string;
  avatar_url: string | null;
  push_token: string | null;
}

interface TeammatePickerModalProps {
  visible: boolean;
  onClose: () => void;
  teamId: string;
  currentUserId: string;
  onSelectMultiple: (teammates: Teammate[]) => void;
}

export default function TeammatePickerModal({
  visible,
  onClose,
  teamId,
  currentUserId,
  onSelectMultiple,
}: TeammatePickerModalProps) {
  const insets = useSafeAreaInsets();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!visible) setSelectedIds(new Set());
  }, [visible]);

  const { data: teammates = [], isLoading } = useQuery({
    queryKey: ['teammates', teamId, currentUserId],
    queryFn: async (): Promise<Teammate[]> => {
      const { data } = await supabase
        .from('profiles')
        .select('id, name, display_name, avatar_url, expo_push_token')
        .eq('team_id', teamId)
        .eq('is_coach', false)
        .neq('id', currentUserId);

      return (data || []).map((m) => ({
        id: m.id,
        name: m.name || m.display_name || 'Unknown Player',
        avatar_url: m.avatar_url,
        push_token: m.expo_push_token ?? null,
      }));
    },
    enabled: visible && !!teamId,
  });

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const confirm = () => {
    onSelectMultiple(teammates.filter((t) => selectedIds.has(t.id)));
  };

  return (
    <Modal visible={visible} animationType='slide' transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
          <View style={styles.handle} />

          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Ionicons name='close' size={20} color='#6B7280' />
          </TouchableOpacity>

          <View style={styles.header}>
            <Text style={styles.emoji}>⚔️</Text>
            <Text style={styles.title}>New Group Challenge</Text>
            <Text style={styles.subtitle}>Select who you want to compete against</Text>
          </View>

          {isLoading ? (
            <ActivityIndicator size='small' color='#1f89ee' style={styles.loader} />
          ) : teammates.length === 0 ? (
            <Text style={styles.empty}>No teammates found</Text>
          ) : (
            <FlatList
              data={teammates}
              keyExtractor={(t) => t.id}
              style={styles.list}
              renderItem={({ item }) => {
                const isSelected = selectedIds.has(item.id);
                return (
                  <TouchableOpacity
                    style={[styles.row, isSelected && styles.rowSelected]}
                    onPress={() => toggleSelection(item.id)}
                    activeOpacity={0.7}
                  >
                    <Image
                      source={{
                        uri: item.avatar_url || 'https://cdn-icons-png.flaticon.com/512/4140/4140037.png',
                      }}
                      style={styles.avatar}
                    />
                    <Text style={[styles.name, isSelected && styles.nameSelected]}>
                      {item.name}
                    </Text>
                    <Ionicons
                      name={isSelected ? 'checkmark-circle' : 'ellipse-outline'}
                      size={22}
                      color={isSelected ? '#1f89ee' : '#D1D5DB'}
                    />
                  </TouchableOpacity>
                );
              }}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
            />
          )}

          <TouchableOpacity
            style={[styles.cta, selectedIds.size === 0 && styles.ctaDisabled]}
            onPress={confirm}
            disabled={selectedIds.size === 0}
            activeOpacity={0.85}
          >
            <Text style={styles.ctaText}>
              {selectedIds.size === 0
                ? 'Select players to continue'
                : `Start Challenge with ${selectedIds.size} player${selectedIds.size > 1 ? 's' : ''} →`}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
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
    maxHeight: '80%',
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
    marginBottom: 20,
    gap: 6,
  },
  emoji: {
    fontSize: 32,
  },
  title: {
    fontSize: 20,
    fontWeight: '900',
    color: '#1a1a2e',
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#78909C',
    textAlign: 'center',
  },
  loader: {
    marginVertical: 24,
  },
  empty: {
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '600',
    color: '#78909C',
    marginVertical: 24,
  },
  list: {
    flexGrow: 0,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
    gap: 12,
    borderRadius: 12,
  },
  rowSelected: {
    backgroundColor: '#EBF4FF',
    paddingHorizontal: 8,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F3F4F6',
  },
  name: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: '#1a1a2e',
  },
  nameSelected: {
    color: '#1f89ee',
  },
  separator: {
    height: 1,
    backgroundColor: '#F3F4F6',
  },
  cta: {
    marginTop: 12,
    backgroundColor: '#1f89ee',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  ctaDisabled: {
    backgroundColor: '#E5E7EB',
  },
  ctaText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#FFF',
  },
});
