import { useDailyChallenge } from '@/hooks/useDailyChallenge';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const DIFFICULTY_COLORS: Record<string, { bg: string; text: string }> = {
  beginner: { bg: '#E8F5E9', text: '#388E3C' },
  intermediate: { bg: '#FFF3E0', text: '#F57C00' },
  advanced: { bg: '#FFEBEE', text: '#D32F2F' },
  elite: { bg: '#EDE7F6', text: '#512DA8' },
};

interface DailyChallengeCardProps {
  userId: string;
  totalXp: number;
}

export default function DailyChallengeCard({ userId, totalXp }: DailyChallengeCardProps) {
  const router = useRouter();
  const { template, isCompleted, isLoading, drills, completedDrillIds } = useDailyChallenge(userId, totalXp);

  if (isLoading) return null;
  if (!template) return null;

  const difficulty = template.difficulty;
  const diffColor = difficulty ? DIFFICULTY_COLORS[difficulty] : null;
  const drillProgress = drills.length > 0
    ? `${completedDrillIds.length}/${drills.length} drills done`
    : null;

  return (
    <View style={[styles.card, isCompleted && styles.cardCompleted]}>
      <View style={styles.header}>
        <Text style={styles.emoji}>🔥</Text>
        <Text style={styles.title}>{"Today's Mission"}</Text>
        {isCompleted && (
          <View style={styles.doneBadge}>
            <Ionicons name='checkmark-circle' size={16} color='#31af4d' />
            <Text style={styles.doneText}>Done</Text>
          </View>
        )}
      </View>

      <Text style={styles.challengeName}>
        {template.category ?? template.name}
      </Text>

      <View style={styles.metaRow}>
        {diffColor && difficulty && (
          <View style={[styles.diffBadge, { backgroundColor: diffColor.bg }]}>
            <Text style={[styles.diffText, { color: diffColor.text }]}>
              {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
            </Text>
          </View>
        )}
        <View style={styles.xpBadge}>
          <Text style={styles.xpText}>
            {isCompleted ? `+${template.xp_reward} XP` : `Earn +${template.xp_reward} XP`}
          </Text>
        </View>
        {drillProgress && !isCompleted && (
          <Text style={styles.progressText}>{drillProgress}</Text>
        )}
      </View>

      {!isCompleted ? (
        <TouchableOpacity
          style={styles.startBtn}
          onPress={() => router.push('/(tabs)/train')}
          activeOpacity={0.85}
        >
          <Text style={styles.startBtnText}>Start Mission</Text>
          <Ionicons name='arrow-forward' size={16} color='#FFF' />
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          style={styles.reviewBtn}
          onPress={() => router.push('/(tabs)/train')}
          activeOpacity={0.85}
        >
          <Text style={styles.reviewBtnText}>View Mission</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 18,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#FED7AA',
    shadowColor: '#ffb724',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  cardCompleted: {
    borderColor: '#BBF7D0',
    shadowColor: '#31af4d',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  emoji: {
    fontSize: 18,
  },
  title: {
    flex: 1,
    fontSize: 13,
    fontWeight: '800',
    color: '#78909C',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  doneBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#DCFCE7',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  doneText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#31af4d',
  },
  challengeName: {
    fontSize: 20,
    fontWeight: '900',
    color: '#1a1a2e',
    marginBottom: 10,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
    flexWrap: 'wrap',
  },
  diffBadge: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  diffText: {
    fontSize: 12,
    fontWeight: '800',
  },
  xpBadge: {
    backgroundColor: '#FEF9EC',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1.5,
    borderColor: '#ffb724',
  },
  xpText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#ffb724',
  },
  progressText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#78909C',
  },
  startBtn: {
    backgroundColor: '#1f89ee',
    borderRadius: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  startBtnText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#FFF',
  },
  reviewBtn: {
    backgroundColor: '#F0F2F5',
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  reviewBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#78909C',
  },
});
