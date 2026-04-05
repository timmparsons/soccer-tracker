import type { ArchivedSeason } from '@/hooks/useArchivedSeasons';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

interface PastSeasonModalProps {
  visible: boolean;
  onClose: () => void;
  season: ArchivedSeason;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function PastSeasonModal({ visible, onClose, season }: PastSeasonModalProps) {
  const dateRange = `${formatDate(season.season_start_date)} – ${formatDate(season.season_end_date)}`;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.handle} />

          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Season {season.season_number}</Text>
              <Text style={styles.dateRange}>{dateRange}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color="#78909C" />
            </TouchableOpacity>
          </View>

          {/* Season summary */}
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>Level {season.final_team_level}</Text>
              <Text style={styles.summaryLabel}>Final Level</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{season.final_team_xp.toLocaleString()}</Text>
              <Text style={styles.summaryLabel}>Team XP</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{season.player_standings.length}</Text>
              <Text style={styles.summaryLabel}>Players</Text>
            </View>
          </View>

          <Text style={styles.standingsTitle}>Final Standings</Text>

          <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
            {season.player_standings.length === 0 ? (
              <Text style={styles.empty}>No standings recorded for this season.</Text>
            ) : (
              season.player_standings.map((player, index) => {
                const isTop3 = index < 3;
                const medals = ['🥇', '🥈', '🥉'];
                return (
                  <View key={player.player_id} style={[styles.row, isTop3 && styles.rowTop3]}>
                    <Text style={styles.rank}>
                      {index < 3 ? medals[index] : `${index + 1}`}
                    </Text>
                    <Image
                      source={{ uri: player.avatar_url || 'https://cdn-icons-png.flaticon.com/512/4140/4140037.png' }}
                      style={styles.avatar}
                    />
                    <Text style={styles.playerName} numberOfLines={1}>{player.name}</Text>
                    <Text style={styles.touches}>{player.total_touches.toLocaleString()}</Text>
                    <Text style={styles.touchesLabel}>touches</Text>
                  </View>
                );
              })
            )}
            <View style={{ height: 24 }} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    maxHeight: '85%',
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '900',
    color: '#1a1a2e',
  },
  dateRange: {
    fontSize: 12,
    fontWeight: '600',
    color: '#78909C',
    marginTop: 2,
  },
  closeBtn: {
    padding: 4,
  },
  summaryRow: {
    flexDirection: 'row',
    backgroundColor: '#F5F7FA',
    borderRadius: 14,
    padding: 14,
    marginBottom: 20,
    alignItems: 'center',
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '900',
    color: '#1a1a2e',
  },
  summaryLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#78909C',
    marginTop: 2,
  },
  summaryDivider: {
    width: 1,
    height: 32,
    backgroundColor: '#E5E7EB',
  },
  standingsTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#1a1a2e',
    marginBottom: 10,
  },
  list: {
    flex: 1,
  },
  empty: {
    fontSize: 13,
    fontWeight: '600',
    color: '#78909C',
    textAlign: 'center',
    paddingVertical: 24,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 10,
    marginBottom: 4,
  },
  rowTop3: {
    backgroundColor: '#F5F7FA',
  },
  rank: {
    fontSize: 16,
    fontWeight: '900',
    color: '#1a1a2e',
    width: 28,
    textAlign: 'center',
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
  },
  playerName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: '#1a1a2e',
  },
  touches: {
    fontSize: 14,
    fontWeight: '900',
    color: '#1f89ee',
  },
  touchesLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#78909C',
  },
});
