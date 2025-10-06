import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import * as Progress from 'react-native-progress';

const ProgressBar = () => {
  const bestToday = 23;
  const goal = 30;
  const progress = bestToday / goal; // 0.65

  return (
    <View>
      <Progress.Bar
        progress={progress}
        width={null} // makes it full width inside container
        height={10}
        borderRadius={5}
        color='#2563eb'
        unfilledColor='#e5e7eb'
        borderWidth={0}
        style={styles.progress}
      />
      {/* Goal Text */}
      <Text style={styles.subtitle}>
        {Math.round(progress * 100)}% to your daily goal of {goal} juggles
      </Text>
    </View>
  );
};

export default ProgressBar;

const styles = StyleSheet.create({
  progress: {
    marginVertical: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
});
