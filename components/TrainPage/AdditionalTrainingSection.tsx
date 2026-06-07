import AdditionalTrainingModal from '@/components/modals/AdditionalTrainingModal';
import { useAdditionalTraining } from '@/hooks/useAdditionalTraining';
import {
  ADDITIONAL_TRAINING_CATEGORIES,
  ADDITIONAL_TRAINING_DAILY_CAP,
  getLevelFromXp,
  type AdditionalTrainingCategory,
} from '@/lib/xp';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';

interface Props {
  userId: string;
  totalXp: number;
}

export default function AdditionalTrainingSection({ userId, totalXp }: Props) {
  const { level } = getLevelFromXp(totalXp);
  const { data, refetch } = useAdditionalTraining(userId);
  const queryClient = useQueryClient();
  const [selectedCategory, setSelectedCategory] = useState<AdditionalTrainingCategory | null>(null);

  const remaining = data?.remaining ?? ADDITIONAL_TRAINING_DAILY_CAP;
  const todayXp = data?.todayXp ?? 0;

  const handleComplete = (xpAwarded: number) => {
    refetch();
    queryClient.invalidateQueries({ queryKey: ['user-xp-stats', userId] });
    queryClient.invalidateQueries({ queryKey: ['profile', userId] });
  };

  const handleClose = () => setSelectedCategory(null);

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.sectionTitle}>Additional Training</Text>
        {todayXp > 0 && (
          <Text style={styles.capIndicator}>
            {todayXp} / {ADDITIONAL_TRAINING_DAILY_CAP} XP
          </Text>
        )}
      </View>

      {ADDITIONAL_TRAINING_CATEGORIES.map((cat) => {
        const locked = level < cat.minLevel;
        const completedToday = data?.sessions.filter((s) => s.category === cat.id).length ?? 0;

        return (
          <TouchableOpacity
            key={cat.id}
            style={[styles.card, locked && styles.cardLocked]}
            onPress={() => !locked && setSelectedCategory(cat)}
            activeOpacity={locked ? 1 : 0.75}
          >
            <View style={[styles.iconBg, locked && styles.iconBgLocked]}>
              <Ionicons
                name={cat.icon as never}
                size={20}
                color={locked ? '#B0BEC5' : '#1f89ee'}
              />
            </View>
            <View style={styles.cardBody}>
              <View style={styles.nameRow}>
                <Text style={[styles.cardTitle, locked && styles.cardTitleLocked]}>
                  {cat.name}
                </Text>
                {completedToday > 0 && (
                  <View style={styles.doneBadge}>
                    <Text style={styles.doneBadgeText}>{completedToday}x done</Text>
                  </View>
                )}
              </View>
              {locked ? (
                <Text style={styles.lockedNote}>Unlocks at Level {cat.minLevel}</Text>
              ) : (
                <Text style={styles.cardDescription}>{cat.description}</Text>
              )}
              {!locked && (
                <View style={styles.xpRow}>
                  {cat.xpRates.map(({ duration, xp }) => (
                    <Text key={duration} style={styles.xpChip}>
                      {duration}m +{xp}
                    </Text>
                  ))}
                </View>
              )}
            </View>
            {!locked && (
              <Ionicons name='chevron-forward' size={18} color='#B0BEC5' />
            )}
            {locked && (
              <Ionicons name='lock-closed-outline' size={18} color='#B0BEC5' />
            )}
          </TouchableOpacity>
        );
      })}

      <AdditionalTrainingModal
        visible={!!selectedCategory}
        category={selectedCategory}
        userId={userId}
        remainingCap={remaining}
        onClose={handleClose}
        onComplete={handleComplete}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#1a1a2e',
  },
  capIndicator: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1f89ee',
    backgroundColor: '#EFF6FF',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 2,
  },
  cardLocked: {
    backgroundColor: '#F8FAFC',
    shadowOpacity: 0,
    elevation: 0,
  },
  iconBg: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBgLocked: {
    backgroundColor: '#F0F2F5',
  },
  cardBody: {
    flex: 1,
    gap: 3,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1a1a2e',
  },
  cardTitleLocked: {
    color: '#B0BEC5',
  },
  cardDescription: {
    fontSize: 13,
    fontWeight: '600',
    color: '#78909C',
  },
  lockedNote: {
    fontSize: 13,
    fontWeight: '600',
    color: '#B0BEC5',
  },
  xpRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 4,
  },
  xpChip: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1f89ee',
    backgroundColor: '#EFF6FF',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  doneBadge: {
    backgroundColor: '#31af4d',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  doneBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFF',
  },
});
