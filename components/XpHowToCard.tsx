import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export default function XpHowToCard() {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>How to Earn XP</Text>

      <View style={styles.row}>
        <Ionicons name='football-outline' size={20} color='#3b82f6' />
        <Text style={styles.text}>
          Complete a juggling session — <Text style={styles.xp}>+20 XP</Text>
        </Text>
      </View>

      <View style={styles.row}>
        <Ionicons name='trophy-outline' size={20} color='#f59e0b' />
        <Text style={styles.text}>
          Hit your daily target — <Text style={styles.xp}>+30 XP</Text>
        </Text>
      </View>

      <View style={styles.row}>
        <Ionicons name='sparkles-outline' size={20} color='#10b981' />
        <Text style={styles.text}>
          New personal best — <Text style={styles.xp}>+50 XP</Text>
        </Text>
      </View>

      <View style={styles.row}>
        <Ionicons name='calendar-outline' size={20} color='#ef4444' />
        <Text style={styles.text}>
          3-day streak — <Text style={styles.xp}>+50 XP</Text>
        </Text>
      </View>

      <View style={styles.row}>
        <Ionicons name='flame-outline' size={20} color='#ef4444' />
        <Text style={styles.text}>
          7-day streak — <Text style={styles.xp}>+100 XP</Text>
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginVertical: 16,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  text: {
    marginLeft: 8,
    fontSize: 15,
  },
  xp: {
    fontWeight: 'bold',
    color: '#3b82f6',
  },
});
