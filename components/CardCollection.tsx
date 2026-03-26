import TradingCardView, { RARITY_COLORS } from '@/components/TradingCard';
import { useAllCards, useUserCards } from '@/hooks/useUserCards';
import type { TradingCard } from '@/lib/checkCards';
import { useState } from 'react';
import {
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import * as Progress from 'react-native-progress';

type FilterKey = 'all' | TradingCard['position'] | TradingCard['rarity'];

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'FWD', label: 'FWD' },
  { key: 'MID', label: 'MID' },
  { key: 'DEF', label: 'DEF' },
  { key: 'GK', label: 'GK' },
  { key: 'common', label: 'Common' },
  { key: 'rare', label: 'Rare' },
  { key: 'epic', label: 'Epic' },
  { key: 'legendary', label: 'Legendary' },
];

interface Props {
  userId: string;
}

export default function CardCollection({ userId }: Props) {
  const { data: allCards = [] } = useAllCards();
  const { data: userCards = [] } = useUserCards(userId);
  const [filter, setFilter] = useState<FilterKey>('all');
  const [selectedCard, setSelectedCard] = useState<TradingCard | null>(null);

  const ownedIds = new Set(userCards.map((uc) => uc.card_id));
  const ownedCount = ownedIds.size;

  const firstEarnedAt = (cardId: string) =>
    userCards.find((uc) => uc.card_id === cardId)?.earned_at ?? null;

  const filteredCards = allCards.filter((c) => {
    if (filter === 'all') return true;
    return c.position === filter || c.rarity === filter;
  });

  const selectedOwned = selectedCard ? ownedIds.has(selectedCard.id) : false;
  const selectedEarnedAt = selectedCard ? firstEarnedAt(selectedCard.id) : null;

  return (
    <View style={styles.container}>
      {/* Progress bar */}
      <View style={styles.progressSection}>
        <View style={styles.progressLabelRow}>
          <Text style={styles.progressLabel}>Collection Progress</Text>
          <Text style={styles.progressCount}>{ownedCount} / {allCards.length}</Text>
        </View>
        <Progress.Bar
          progress={allCards.length > 0 ? ownedCount / allCards.length : 0}
          width={null}
          height={8}
          borderRadius={4}
          color='#8b5cf6'
          unfilledColor='#2d2d4e'
          borderWidth={0}
        />
      </View>

      {/* Filter pills */}
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={FILTERS}
        keyExtractor={(f) => f.key}
        style={styles.filterScroll}
        contentContainerStyle={styles.filterContent}
        renderItem={({ item: f }) => (
          <TouchableOpacity
            style={[styles.filterPill, filter === f.key && styles.filterPillActive]}
            onPress={() => setFilter(f.key)}
          >
            <Text style={[styles.filterText, filter === f.key && styles.filterTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        )}
      />

      {/* Card grid */}
      <FlatList
        data={filteredCards}
        numColumns={4}
        keyExtractor={(c) => c.id}
        style={styles.cardGrid}
        contentContainerStyle={styles.grid}
        columnWrapperStyle={styles.row}
        renderItem={({ item }) => (
          <TradingCardView
            card={item}
            owned={ownedIds.has(item.id)}
            size='sm'
            onPress={() => setSelectedCard(item)}
          />
        )}
      />

      {/* Card detail modal */}
      <Modal
        visible={!!selectedCard}
        transparent
        animationType='fade'
        onRequestClose={() => setSelectedCard(null)}
      >
        <TouchableOpacity
          style={styles.detailOverlay}
          activeOpacity={1}
          onPress={() => setSelectedCard(null)}
        >
          <TouchableOpacity activeOpacity={1} style={styles.detailSheet}>
            {selectedCard && (
              <>
                <TradingCardView
                  card={selectedCard}
                  owned={selectedOwned}
                  size='lg'
                />
                <Text style={[styles.detailName, { color: selectedOwned ? RARITY_COLORS[selectedCard.rarity] : '#555' }]}>
                  {selectedCard.player_name}
                </Text>
                <Text style={styles.detailMeta}>
                  {selectedCard.flag_emoji} {selectedCard.nationality} · {selectedCard.position}
                </Text>
                {selectedOwned && selectedEarnedAt ? (
                  <Text style={styles.earnedDate}>
                    Earned {new Date(selectedEarnedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </Text>
                ) : (
                  <Text style={styles.lockedText}>
                    {selectedCard.milestone_touches != null
                      ? `Unlock at ${selectedCard.milestone_touches.toLocaleString()} touches`
                      : 'Available as a session drop'}
                  </Text>
                )}
              </>
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f1a',
  },
  progressSection: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    gap: 6,
  },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#9CA3AF',
  },
  progressCount: {
    fontSize: 13,
    fontWeight: '900',
    color: '#8b5cf6',
  },
  filterScroll: {
    flexGrow: 0,
    flexShrink: 0,
  },
  filterContent: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardGrid: {
    flex: 1,
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#1e1e35',
    borderWidth: 1,
    borderColor: '#2d2d4e',
    flexShrink: 0,
  },
  filterPillActive: {
    backgroundColor: '#8b5cf6',
    borderColor: '#8b5cf6',
  },
  filterText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6b7280',
  },
  filterTextActive: {
    color: '#fff',
  },
  grid: {
    paddingHorizontal: 8,
    paddingVertical: 8,
    gap: 8,
  },
  row: {
    gap: 8,
  },
  detailOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailSheet: {
    backgroundColor: '#1a1a2e',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    gap: 8,
  },
  detailName: {
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'center',
    marginTop: 8,
  },
  detailMeta: {
    fontSize: 14,
    fontWeight: '600',
    color: '#78909C',
  },
  earnedDate: {
    fontSize: 13,
    fontWeight: '600',
    color: '#22c55e',
  },
  lockedText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6b7280',
    textAlign: 'center',
  },
});
