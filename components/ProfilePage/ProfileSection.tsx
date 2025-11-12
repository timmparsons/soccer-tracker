import { supabase } from '@/lib/supabase';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import {
  Button,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const ProfilePage = () => {
  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          <Image
            source={{
              uri: 'https://cdn-icons-png.flaticon.com/512/4140/4140037.png',
            }}
            style={styles.avatar}
          />
          <TouchableOpacity style={styles.editIcon}>
            <Ionicons name='settings-sharp' size={20} color='#fff' />
          </TouchableOpacity>
        </View>

        <Text style={styles.name}>Tim Parsons</Text>
        <Text style={styles.tagline}>Future Juggling Pro ⚽</Text>
      </View>

      {/* XP + Rank Card */}
      <View style={styles.rankCard}>
        <View style={styles.rankHeader}>
          <Text style={styles.rankTitle}>Level 6</Text>
          <Text style={styles.rankSubtitle}>Gold Rank 🥇</Text>
        </View>

        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: '75%' }]} />
        </View>
        <Text style={styles.rankText}>750 / 1000 XP</Text>
      </View>

      {/* Streak Card */}
      <View style={styles.streakCard}>
        <View style={styles.streakRow}>
          <Ionicons name='flame' size={28} color='#f59e0b' />
          <View style={styles.streakTextBlock}>
            <Text style={styles.streakMain}>9-Day Streak</Text>
            <Text style={styles.streakSub}>Longest Streak: 12 days</Text>
          </View>
        </View>
        <Text style={styles.streakMessage}>Keep the fire going! 🔥</Text>
      </View>

      {/* Achievements */}
      <Text style={styles.sectionTitle}>Achievements</Text>
      <View style={styles.achievementsGrid}>
        {[
          { icon: 'trophy', label: 'First 100 Juggles', color: '#f59e0b' },
          { icon: 'run-fast', label: '7-Day Streak', color: '#22c55e' },
          { icon: 'star-circle', label: 'Consistency King', color: '#3b82f6' },
          { icon: 'clock', label: '1 Hour Total', color: '#a855f7' },
          { icon: 'medal', label: 'Top 10 Leaderboard', color: '#ef4444' },
          {
            icon: 'shield-check',
            label: 'Completed 10 Sessions',
            color: '#10b981',
          },
        ].map((badge, index) => (
          <View key={index} style={styles.badgeCard}>
            <MaterialCommunityIcons
              name={badge.icon}
              size={36}
              color={badge.color}
            />
            <Text style={styles.badgeLabel}>{badge.label}</Text>
          </View>
        ))}
      </View>

      {/* Actions */}
      <Text style={styles.sectionTitle}>Account</Text>
      <View style={styles.actionList}>
        <TouchableOpacity style={styles.actionRow}>
          <Ionicons name='person-outline' size={22} color='#3b82f6' />
          <Text style={styles.actionText}>Edit Profile</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionRow}>
          <Ionicons name='notifications-outline' size={22} color='#3b82f6' />
          <Text style={styles.actionText}>Notifications</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionRow}>
          <Ionicons name='help-circle-outline' size={22} color='#3b82f6' />
          <Text style={styles.actionText}>Help & Support</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionRow}>
          <Ionicons name='log-out-outline' size={22} color='#ef4444' />
          <Text style={[styles.actionText, { color: '#ef4444' }]}>Log Out</Text>
        </TouchableOpacity>
      </View>

      {/* Tip Card */}
      <View style={styles.tipCard}>
        <Text style={styles.tipTitle}>Coach’s Tip 💬</Text>
        <Text style={styles.tipText}>
          “Improvement isn’t about perfection — it’s about progress. Keep
          showing up and the results will come.”
        </Text>
      </View>
      <Button title='Sign Out' onPress={handleSignOut} />
    </ScrollView>
  );
};

export default ProfilePage;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
    paddingHorizontal: 16,
  },
  header: {
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 12,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  editIcon: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#3b82f6',
    borderRadius: 50,
    padding: 6,
  },
  name: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginTop: 8,
  },
  tagline: {
    color: '#6b7280',
    fontSize: 14,
  },
  rankCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginTop: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  rankHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  rankTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  rankSubtitle: { fontSize: 15, color: '#6b7280' },
  progressBar: {
    height: 10,
    backgroundColor: '#e5e7eb',
    borderRadius: 8,
    marginTop: 12,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#3b82f6',
    borderRadius: 8,
  },
  rankText: {
    fontSize: 13,
    color: '#6b7280',
    textAlign: 'right',
    marginTop: 6,
  },
  streakCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginTop: 20,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  streakRow: { flexDirection: 'row', alignItems: 'center' },
  streakTextBlock: { marginLeft: 12 },
  streakMain: { fontSize: 17, fontWeight: '700', color: '#111827' },
  streakSub: { fontSize: 13, color: '#6b7280' },
  streakMessage: { color: '#3b82f6', marginTop: 8, fontWeight: '600' },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginTop: 24,
    marginBottom: 8,
  },
  achievementsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  badgeCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingVertical: 16,
    width: '47%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  badgeLabel: {
    fontSize: 13,
    color: '#111827',
    fontWeight: '600',
    marginTop: 6,
    textAlign: 'center',
  },
  actionList: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginTop: 8,
    paddingVertical: 4,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 0.5,
    borderColor: '#e5e7eb',
  },
  actionText: {
    fontSize: 15,
    color: '#111827',
    fontWeight: '500',
    marginLeft: 12,
  },
  tipCard: {
    backgroundColor: '#e0f2fe',
    borderRadius: 16,
    padding: 16,
    marginVertical: 24,
  },
  tipTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0369a1',
    marginBottom: 4,
  },
  tipText: {
    fontSize: 14,
    color: '#075985',
    lineHeight: 20,
  },
});
