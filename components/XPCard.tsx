import { getRankBadge } from '@/lib/xp';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import ConfettiCannon from 'react-native-confetti-cannon';

type XPCardProps = {
  level: number;
  xpIntoLevel: number;
  xpForNextLevel: number;
  rankName: string;
  onOpenRoadmap?: () => void;
};

export default function XPCard({
  level,
  xpIntoLevel,
  xpForNextLevel,
  rankName,
  onOpenRoadmap,
}: XPCardProps) {
  const pct = Math.min((xpIntoLevel / xpForNextLevel) * 100, 100);
  const { color, icon } = getRankBadge(rankName);

  const [modalVisible, setModalVisible] = useState(false);

  /* -----------------------------------------------------------
     CONFETTI LOGIC (LEVEL UP ONLY)
  ------------------------------------------------------------ */
  const prevLevelRef = useRef<number | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    // First render: initialize, do NOT celebrate
    if (prevLevelRef.current === null) {
      prevLevelRef.current = level;
      return;
    }

    if (level > prevLevelRef.current) {
      // Small delay makes it feel intentional
      setTimeout(() => setShowConfetti(true), 300);
    }

    prevLevelRef.current = level;
  }, [level]);

  useEffect(() => {
    if (!showConfetti) return;

    const timer = setTimeout(() => {
      setShowConfetti(false);
    }, 2500);

    return () => clearTimeout(timer);
  }, [showConfetti]);

  /* -----------------------------------------------------------
     UI
  ------------------------------------------------------------ */
  return (
    <>
      <View style={[styles.card, { borderLeftColor: color }]}>
        <View style={styles.topRow}>
          <Ionicons
            name={icon as any}
            size={28}
            color={color}
            style={{ marginRight: 10 }}
          />

          <View style={{ flex: 1 }}>
            <Text style={styles.level}>Level {level}</Text>
            <Text style={[styles.rank, { color }]}>{rankName}</Text>
          </View>

          <Text style={styles.xpText}>
            {xpIntoLevel} / {xpForNextLevel} XP
          </Text>

          <TouchableOpacity onPress={() => setModalVisible(true)}>
            <Ionicons name='help-circle-outline' size={22} color='#6b7280' />
          </TouchableOpacity>
        </View>

        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              { width: `${pct}%`, backgroundColor: color },
            ]}
          />
        </View>

        <TouchableOpacity
          style={[styles.roadmapButton, { borderColor: color }]}
          onPress={onOpenRoadmap}
        >
          <Text style={[styles.roadmapButtonText, { color }]}>
            View Roadmap
          </Text>
          <Ionicons name='chevron-forward' size={18} color={color} />
        </TouchableOpacity>
      </View>

      {/* CONFETTI (LEVEL UP ONLY) */}
      {showConfetti && (
        <ConfettiCannon
          count={Math.min(120, level * 10)}
          fadeOut
          origin={{ x: -10, y: 0 }}
        />
      )}

      {/* HOW XP WORKS MODAL */}
      <Modal transparent animationType='slide' visible={modalVisible}>
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

/* -----------------------------------------------------------
   STYLES
------------------------------------------------------------ */
const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginTop: 20,
    borderLeftWidth: 6,
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  level: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  rank: {
    fontSize: 14,
    marginTop: 2,
    fontWeight: '600',
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
  roadmapButton: {
    marginTop: 14,
    paddingVertical: 10,
    borderWidth: 1.5,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  roadmapButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
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
