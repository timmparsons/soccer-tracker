import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type Props = {
  level: number;
  xpIntoLevel: number;
  xpForNextLevel: number;
  rankName: string;
};

export default function XPCard({
  level,
  xpIntoLevel,
  xpForNextLevel,
  rankName,
}: Props) {
  const pct = Math.min((xpIntoLevel / xpForNextLevel) * 100, 100);

  const [modalVisible, setModalVisible] = useState(false);

  return (
    <>
      <View style={styles.card}>
        <View style={styles.topRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.level}>Level {level}</Text>
            <Text style={styles.rank}>{rankName}</Text>
          </View>

          <Text style={styles.xpText}>
            {xpIntoLevel} / {xpForNextLevel} XP
          </Text>

          <TouchableOpacity onPress={() => setModalVisible(true)}>
            <Ionicons name='help-circle-outline' size={22} color='#6b7280' />
          </TouchableOpacity>
        </View>

        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${pct}%` }]} />
        </View>
      </View>

      {/* MODAL */}
      <Modal
        animationType='slide'
        transparent
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>How XP Works</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name='close' size={26} color='#111827' />
              </TouchableOpacity>
            </View>

            <View style={styles.modalContent}>
              <Text style={styles.item}>• Juggling session → +20 XP</Text>
              <Text style={styles.item}>• Daily target hit → +30 XP</Text>
              <Text style={styles.item}>• New personal best → +50 XP</Text>
              <Text style={styles.item}>• 3-day streak → +50 XP</Text>
              <Text style={styles.item}>• 7-day streak → +100 XP</Text>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginTop: 20,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 10,
  },
  level: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  rank: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  xpText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3b82f6',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#e5e7eb',
    borderRadius: 6,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#3b82f6',
  },

  // MODAL STYLES
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 40,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingBottom: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  modalContent: {
    marginTop: 20,
  },
  item: {
    fontSize: 16,
    color: '#374151',
    marginBottom: 12,
  },
});
