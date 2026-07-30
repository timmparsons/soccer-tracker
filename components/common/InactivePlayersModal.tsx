import { InactivePlayer } from '@/hooks/useInactivePlayers';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Image, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface InactivePlayersModalProps {
  visible: boolean;
  onClose: () => void;
  players: InactivePlayer[];
}

const InactivePlayersModal = ({ visible, onClose, players }: InactivePlayersModalProps) => {
  return (
    <Modal visible={visible} transparent animationType='slide' onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>Needs a Nudge</Text>
            <Text style={styles.subtitle}>
              {players.length === 0
                ? 'Everyone has trained in the last 3 days'
                : `${players.length} player${players.length === 1 ? '' : 's'} haven't trained in 3+ days`}
            </Text>
          </View>
          {players.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name='checkmark-circle' size={40} color='#31af4d' />
              <Text style={styles.emptyText}>Squad is on track</Text>
            </View>
          ) : (
            <ScrollView style={{ maxHeight: 360 }} showsVerticalScrollIndicator={false}>
              {players.map((player) => {
                const name = player.display_name || player.name || 'Player';
                const lastDate = player.last_session_date;
                let lastLabel = 'Never trained';
                if (lastDate) {
                  const days = Math.floor(
                    (Date.now() - new Date(lastDate + 'T00:00:00').getTime()) /
                      (1000 * 60 * 60 * 24),
                  );
                  lastLabel = days === 1 ? 'Last trained yesterday' : `Last trained ${days} days ago`;
                }
                return (
                  <View key={player.id} style={styles.row}>
                    <Image
                      source={{
                        uri: player.avatar_url || 'https://cdn-icons-png.flaticon.com/512/4140/4140037.png',
                      }}
                      style={styles.avatar}
                    />
                    <View style={styles.info}>
                      <Text style={styles.playerName}>{name}</Text>
                      <Text style={styles.lastSeen}>{lastLabel}</Text>
                    </View>
                    <Ionicons name='alert-circle' size={20} color='#F59E0B' />
                  </View>
                );
              })}
            </ScrollView>
          )}
          <TouchableOpacity style={styles.dismiss} onPress={onClose}>
            <Text style={styles.dismissText}>Done</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

export default InactivePlayersModal;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '900',
    color: '#1a1a2e',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#78909C',
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 8,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#31af4d',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    gap: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  info: {
    flex: 1,
  },
  playerName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1a1a2e',
  },
  lastSeen: {
    fontSize: 13,
    fontWeight: '600',
    color: '#F59E0B',
    marginTop: 2,
  },
  dismiss: {
    marginTop: 20,
    backgroundColor: '#F5F7FA',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  dismissText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1a1a2e',
  },
});
