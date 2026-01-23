// components/MinimumRequirementModal.tsx
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

interface PlayerWithMinimum {
  id: string;
  display_name: string;
  xpThisLevel: number;
  minimumNeeded: number;
  remaining: number;
}

interface MinimumRequirementModalProps {
  visible: boolean;
  onClose: () => void;
  playersNeedingMinimum: PlayerWithMinimum[];
  minimumXpPerPlayer: number;
  nextLevel: number;
}

export function MinimumRequirementModal({
  visible,
  onClose,
  playersNeedingMinimum,
  minimumXpPerPlayer,
  nextLevel,
}: MinimumRequirementModalProps) {
  return (
    <Modal
      visible={visible}
      animationType='fade'
      transparent={true}
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <TouchableOpacity
          style={styles.modalContainer}
          activeOpacity={1}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerIcon}>
              <Ionicons name='alert-circle' size={32} color='#F59E0B' />
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name='close' size={24} color='#6B7280' />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <Text style={styles.title}>Minimum Not Met</Text>
          <Text style={styles.subtitle}>
            For true teamwork, each player needs at least {minimumXpPerPlayer}{' '}
            XP to reach Level {nextLevel}.
          </Text>

          <View style={styles.divider} />

          <Text style={styles.sectionTitle}>
            {playersNeedingMinimum.length}{' '}
            {playersNeedingMinimum.length === 1
              ? "player hasn't"
              : "players haven't"}{' '}
            reached the minimum:
          </Text>

          <ScrollView
            style={styles.playersList}
            showsVerticalScrollIndicator={false}
          >
            {playersNeedingMinimum.map((player) => (
              <View key={player.id} style={styles.playerRow}>
                <View style={styles.playerInfo}>
                  <Ionicons name='person' size={20} color='#F59E0B' />
                  <Text style={styles.playerName}>{player.display_name}</Text>
                </View>
                <View style={styles.playerProgress}>
                  <Text style={styles.progressText}>
                    {player.xpThisLevel} / {player.minimumNeeded} XP
                  </Text>
                  <Text style={styles.remainingText}>
                    {player.remaining} needed
                  </Text>
                </View>
              </View>
            ))}
          </ScrollView>

          <TouchableOpacity style={styles.closeButtonBottom} onPress={onClose}>
            <Text style={styles.closeButtonText}>Got it</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    color: '#2C3E50',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6B7280',
    lineHeight: 22,
    marginBottom: 20,
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#92400E',
    marginBottom: 16,
  },
  playersList: {
    maxHeight: 300,
  },
  playerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  playerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  playerName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#2C3E50',
  },
  playerProgress: {
    alignItems: 'flex-end',
  },
  progressText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#92400E',
  },
  remainingText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#78350F',
  },
  closeButtonBottom: {
    backgroundColor: '#F59E0B',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFF',
  },
});
