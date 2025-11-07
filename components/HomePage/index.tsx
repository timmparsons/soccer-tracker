import { supabase } from '@/lib/supabase';
import { User } from '@supabase/supabase-js';
import React, { useEffect, useState } from 'react';
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

type Stats = {
  sessions: number;
  totalTime: number;
  improvement: number;
};

const HomeScreen = () => {
  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      // try {
      // 1️⃣ Get the authenticated user
      const { data: authData, error: userError } =
        await supabase.auth.getUser();
      // if (userError) throw userError;
      // if (!authData.user) throw new Error('No authenticated user found');
      console.log('Auth user data:', authData);
      // setUser(authData.user);

      //   // 2️⃣ Query the sessions table for that user
      const { data: sessions, error: sessionError } = await supabase
        .from('sessions')
        .select('duration_minutes, improvement')
        .eq('user_id', '00000000-0000-0000-0000-000000000000');
      console.log('Sessions data:', sessions);
      //   if (sessionError) throw sessionError;

      //   // 3️⃣ Calculate stats
      //   const totalSessions = sessions.length;
      //   const totalTime = sessions.reduce(
      //     (sum, s) => sum + s.duration_minutes,
      //     0
      //   );
      //   const avgImprovement =
      //     sessions.length > 0
      //       ? sessions.reduce((sum, s) => sum + s.improvement, 0) /
      //         sessions.length
      //       : 0;

      //   // 4️⃣ Save results to state
      //   setStats({
      //     sessions: totalSessions,
      //     totalTime,
      //     improvement: Math.round(avgImprovement),
      //   });
      // } catch (error) {
      //   console.error('Error fetching stats:', error);
      // } finally {
      //   setLoading(false);
      // }
    };

    fetchStats();
  }, []);
  console.log('User:', user);
  // ✅ Only one return — JSX
  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.greeting}>
          {loading
            ? 'Loading...'
            : `Good Morning, ${
                user?.user_metadata?.username || user?.email || 'Player'
              } 👋`}
        </Text>
        <Image
          source={require('../../assets/images/soccer-boy.png')}
          style={styles.avatar}
        />
      </View>

      {/* Daily Challenge */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Daily Challenge</Text>
        <Text style={styles.challengeName}>Keep It Up Challenge</Text>
        <Text style={styles.challengeDesc}>
          Juggle the ball 25 times without dropping it
        </Text>
        <TouchableOpacity style={styles.startButton}>
          <Text style={styles.startButtonText}>Start Challenge</Text>
        </TouchableOpacity>
      </View>

      {/* Quick Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{stats?.sessions ?? 0}</Text>
          <Text style={styles.statLabel}>Sessions</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{stats?.totalTime ?? 0} mins</Text>
          <Text style={styles.statLabel}>Total Time</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{stats?.improvement ?? 0}%</Text>
          <Text style={styles.statLabel}>Improvement</Text>
        </View>
      </View>

      {/* Coach’s Tip */}
      <View style={styles.tipContainer}>
        <Text style={styles.tipTitle}>Coach’s Tip</Text>
        <Text style={styles.tipText}>
          Keep your eyes on the ball and use both feet to stay balanced.
        </Text>
      </View>
    </ScrollView>
  );
};

// ✅ everything below this point stays the same
const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#f7f9fc',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 25,
  },
  greeting: {
    fontSize: 22,
    fontWeight: '700',
    color: '#222',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6,
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
    color: '#111',
  },
  challengeName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
    marginBottom: 4,
  },
  challengeDesc: {
    fontSize: 14,
    color: '#555',
    marginBottom: 10,
  },
  startButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  startButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 14,
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111',
  },
  statLabel: {
    fontSize: 13,
    color: '#555',
  },
  tipContainer: {
    backgroundColor: '#e8f4ff',
    padding: 16,
    borderRadius: 12,
  },
  tipTitle: {
    fontWeight: '700',
    fontSize: 16,
    marginBottom: 4,
    color: '#007AFF',
  },
  tipText: {
    color: '#333',
    fontSize: 14,
  },
});

export default HomeScreen;
