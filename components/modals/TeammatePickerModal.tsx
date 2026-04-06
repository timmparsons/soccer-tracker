import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import React from 'react';
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

interface Teammate {
  id: string;
  name: string;
  avatar_url: string | null;
}

interface TeammatePickerModalProps {
  visible: boolean;
  onClose: () => void;
  teamId: string;
  currentUserId: string;
  onSelect: (teammate: Teammate) => void;
}

export default function TeammatePickerModal({
  visible,
  onClose,
  teamId,
  currentUserId,
  onSelect,
}: TeammatePickerModalProps) {
  const insets = useSafeAreaInsets();

  const { data: teammates = [], isLoading } = useQuery({
    queryKey: ['teammates', teamId, currentUserId],
    queryFn: async (): Promise<Teammate[]> => {
      const { data } = await supabase
        .from('profiles')
        .select('id, name, display_name, avatar_url')
        .eq('team_id', teamId)
        .eq('is_coach', false)
        .neq('id', currentUserId);

      return (data || []).map((m) => ({
        id: m.id,
        name: m.name || m.display_name || 'Unknown Player',
        avatar_url: m.avatar_url,
      }));
    },
    enabled: visible && !!teamId,
  });

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
            <Text style={styles.title}>Challenge a Teammate</Text>
            <Text style={styles.subtitle}>Pick who you want to go head to head with</Text>
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
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.row}
                  onPress={() => onSelect(item)}
                  activeOpacity={0.7}
                >
                  <Image
                    source={{
                      uri: item.avatar_url || 'https://cdn-icons-png.flaticon.com/512/4140/4140037.png',
                    }}
                    style={styles.avatar}
                  />
                  <Text style={styles.name}>{item.name}</Text>
                  <Ionicons name='chevron-forward' size={16} color='#9CA3AF' />
                </TouchableOpacity>
              )}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
            />
          )}
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
    gap: 12,
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
  separator: {
    height: 1,
    backgroundColor: '#F3F4F6',
  },
});
