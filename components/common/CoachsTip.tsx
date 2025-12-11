import tipsData from '@/constants/allCoachesTips.json';
import { getRandomCoachTip } from '@/utils/getRandomCoachTips';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

const CoachsTip = () => {
  const tip = getRandomCoachTip(tipsData);

  return (
    <View style={styles.tipCard}>
      <Text style={styles.tipTitle}>Coach&apos;s Tip 💬</Text>
      <Text style={styles.tipText}>{tip}</Text>
    </View>
  );
};

export default CoachsTip;

const styles = StyleSheet.create({
  tipCard: {
    backgroundColor: '#e0f2fe',
    padding: 16,
    borderRadius: 14,
    marginBottom: 40,
    marginVertical: 40,
  },
  tipTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0369a1',
    marginBottom: 4,
  },
  tipText: {
    color: '#075985',
    fontSize: 14,
    lineHeight: 20,
  },
});
