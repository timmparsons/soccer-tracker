import React from 'react';
import { StyleSheet, View } from 'react-native';

interface Props {
  data: number[];
  color?: string;
  height?: number;
}

const MiniSparkline = ({ data, color = '#1f89ee', height = 32 }: Props) => {
  const max = Math.max(...data, 1);

  return (
    <View style={[styles.container, { height }]}>
      {data.map((val, i) => {
        const barH = Math.max((val / max) * height, val > 0 ? 4 : 2);
        return (
          <View key={i} style={[styles.barWrapper, { height }]}>
            <View
              style={[
                styles.bar,
                {
                  height: barH,
                  backgroundColor: val > 0 ? color : '#E5E7EB',
                  opacity: val > 0 ? 0.85 : 1,
                },
              ]}
            />
          </View>
        );
      })}
    </View>
  );
};

export default MiniSparkline;

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 3,
  },
  barWrapper: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  bar: {
    width: '100%',
    borderRadius: 2,
  },
});
