import { getVinnieMood } from '@/lib/vinnie';
import React, { useMemo } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

interface VinnieCardProps {
  trainedToday: boolean;
  streak: number;
}

const VinnieCard = ({ trainedToday, streak }: VinnieCardProps) => {
  const hour = new Date().getHours();

  const { message } = useMemo(
    () => getVinnieMood({ trainedToday, streak, hour }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [trainedToday, streak]
  );

  return (
    <View style={styles.row}>
      <Image
        source={require('@/assets/images/vinnie.png')}
        style={styles.vinnieImage}
        resizeMode='contain'
      />

      {/* Speech bubble with tail */}
      <View style={styles.bubbleRow}>
        <View style={styles.tail} />
        <View style={styles.bubble}>
          <Text style={styles.message}>{message} — Coach Vinnie</Text>
        </View>
      </View>
    </View>
  );
};

export default VinnieCard;

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  vinnieImage: {
    width: 90,
    height: 90,
    flexShrink: 0,
  },
  bubbleRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  tail: {
    width: 0,
    height: 0,
    borderTopWidth: 8,
    borderBottomWidth: 8,
    borderRightWidth: 12,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderRightColor: '#E8E8E8',
  },
  bubble: {
    flex: 1,
    backgroundColor: '#E8E8E8',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  message: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1a1a2e',
    lineHeight: 21,
  },
});
