import tipsData from '@/constants/allCoachesTips.json';
import { getRandomCoachTip } from '@/utils/getRandomCoachTips';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

const CoachsTip = () => {
  const tip = getRandomCoachTip(tipsData);

  return (
    <View style={styles.tipCard}>
      <View style={styles.headerRow}>
        <Ionicons name='bulb-outline' size={20} color='#6B7280' />
        <Text style={styles.tipTitle}>Coach's Tip</Text>
      </View>
      <Text style={styles.tipText}>{tip}</Text>
    </View>
  );
};

export default CoachsTip;

const styles = StyleSheet.create({
  tipCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 18,
    marginVertical: 24,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  tipTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#2C3E50',
    letterSpacing: 0.3,
  },
  tipText: {
    color: '#6B7280',
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '500',
  },
});
