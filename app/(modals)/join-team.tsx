import { useProfile } from '@/hooks/useProfile';
import { useUser } from '@/hooks/useUser';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function JoinTeam() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { data: user } = useUser();
  const { data: profile, refetch: refetchProfile } = useProfile(user?.id);

  const [teamCode, setTeamCode] = useState('');
  const [loading, setLoading] = useState(false);

  // If already on a team, redirect
  if (profile?.team_id) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <Ionicons name='checkmark-circle' size={64} color='#22c55e' />
          <Text style={styles.title}>Already on a Team!</Text>
          <Text style={styles.subtitle}>
            You're already part of a team. Leave your current team to join a
            different one.
          </Text>
          <TouchableOpacity style={styles.button} onPress={() => router.back()}>
            <Text style={styles.buttonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const handleJoinTeam = async () => {
    if (!teamCode.trim()) {
      Alert.alert('Team Code Required', 'Please enter a team code');
      return;
    }

    if (!user?.id) {
      Alert.alert('Error', 'You must be logged in to join a team');
      return;
    }

    setLoading(true);

    try {
      // Find team by code (case-insensitive)
      const { data: team, error: teamError } = await supabase
        .from('teams')
        .select('id, name')
        .ilike('code', teamCode.trim())
        .single();

      if (teamError || !team) {
        Alert.alert(
          'Invalid Code',
          "That team code doesn't exist. Check the code and try again."
        );
        setLoading(false);
        return;
      }

      // Update user's profile to join the team
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ team_id: team.id })
        .eq('id', user.id);

      if (profileError) throw profileError;

      console.log('✅ Successfully updated profile with team_id:', team.id);

      // IMPORTANT: Invalidate ALL queries related to this user
      queryClient.invalidateQueries({ queryKey: ['profile', user.id] });
      queryClient.invalidateQueries({ queryKey: ['team', user.id] });

      // Wait for database to propagate
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Force refetch with the invalidated cache
      await refetchProfile();

      console.log('✅ Profile refetched');

      // Show success
      Alert.alert(
        'Welcome to the Team! 🎉',
        `You've joined ${team.name}! Check out your team's progress on the leaderboard.`,
        [
          {
            text: 'Done',
            onPress: () => router.replace('/(tabs)/profile'),
          },
        ]
      );
    } catch (error: any) {
      console.error('Error joining team:', error);
      Alert.alert('Error', error.message || 'Failed to join team');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps='handled'
        >
          {/* Header */}
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name='arrow-back' size={24} color='#2C3E50' />
          </TouchableOpacity>

          <View style={styles.iconContainer}>
            <Ionicons name='enter' size={64} color='#2B9FFF' />
          </View>

          <Text style={styles.title}>Join a Team</Text>
          <Text style={styles.subtitle}>
            Enter the team code your coach or teammate shared with you
          </Text>

          {/* Team Code Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Team Code</Text>
            <TextInput
              style={styles.input}
              placeholder='e.g., ABC12345'
              placeholderTextColor='#9CA3AF'
              value={teamCode}
              onChangeText={(text) => setTeamCode(text)}
              autoCapitalize='characters'
              maxLength={8}
              autoCorrect={false}
            />
            <Text style={styles.hint}>
              Ask your coach or teammate for the 8-character team code
            </Text>
          </View>

          {/* Info Cards */}
          <View style={styles.infoCard}>
            <Ionicons name='information-circle' size={24} color='#2B9FFF' />
            <View style={styles.infoContent}>
              <Text style={styles.infoTitle}>What Happens Next</Text>
              <Text style={styles.infoText}>
                • You'll join your team's leaderboard{'\n'}• See your teammates'
                progress{'\n'}• Compete together and track improvement
              </Text>
            </View>
          </View>

          <View style={styles.helpCard}>
            <Ionicons name='help-circle' size={20} color='#6B7280' />
            <View style={styles.helpContent}>
              <Text style={styles.helpTitle}>Don't have a code?</Text>
              <Text style={styles.helpText}>
                Ask your coach or a teammate to share it, or{' '}
                <Text
                  style={styles.helpLink}
                  onPress={() => router.push('/create-team')}
                >
                  create your own team
                </Text>
              </Text>
            </View>
          </View>

          {/* Join Button */}
          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleJoinTeam}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color='#FFF' />
            ) : (
              <>
                <Ionicons name='checkmark-circle' size={24} color='#FFF' />
                <Text style={styles.buttonText}>Join Team</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F9FF',
  },
  flex: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(43, 159, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    color: '#2C3E50',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
    fontWeight: '500',
  },
  inputContainer: {
    marginBottom: 24,
  },
  label: {
    fontSize: 15,
    fontWeight: '800',
    color: '#2C3E50',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 18,
    fontSize: 16,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    fontWeight: '600',
    color: '#2C3E50',
  },
  hint: {
    fontSize: 13,
    color: '#9CA3AF',
    marginTop: 8,
    fontWeight: '500',
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#2C3E50',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 22,
    fontWeight: '500',
  },
  helpCard: {
    flexDirection: 'row',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    gap: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  helpContent: {
    flex: 1,
  },
  helpTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2C3E50',
    marginBottom: 4,
  },
  helpText: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 20,
    fontWeight: '500',
  },
  helpLink: {
    color: '#2B9FFF',
    fontWeight: '800',
    textDecorationLine: 'underline',
  },
  button: {
    flexDirection: 'row',
    backgroundColor: '#FFA500',
    paddingVertical: 18,
    paddingHorizontal: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    shadowColor: '#FFA500',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
});
