import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface CoachCombinationBannerProps {
  combinationText: string | null;
  onPress: () => void;
}

export default function CoachCombinationBanner({ combinationText, onPress }: CoachCombinationBannerProps) {
  if (!combinationText) return null;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.header}>
        <Text style={styles.headerText}>🚨 COACH'S WEEKLY COMBINATION</Text>
      </View>
      <View style={styles.body}>
        <Text style={styles.comboText}>{combinationText}</Text>
        <View style={styles.footer}>
          <Text style={styles.footerText}>⚠️ 3 random players will be selected to test this combo live at Saturday's kickoff circle. Don't get caught out.</Text>
          <Ionicons name='play-circle' size={20} color='#ffb724' />
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1a1a2e',
    borderRadius: 20,
    marginBottom: 16,
    overflow: 'hidden',
  },
  header: {
    backgroundColor: '#ffb724',
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  headerText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#1a1a2e',
    letterSpacing: 0.3,
  },
  body: {
    padding: 16,
  },
  comboText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    lineHeight: 23,
    marginBottom: 14,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  footerText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.55)',
    lineHeight: 17,
  },
});
