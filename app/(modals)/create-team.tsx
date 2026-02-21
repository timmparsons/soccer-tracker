import { useProfile } from '@/hooks/useProfile';
import { useUser } from '@/hooks/useUser';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
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

export default function CreateTeam() {
  const router = useRouter();
  const { data: user } = useUser();
  const { data: profile, refetch: refetchProfile } = useProfile(user?.id);

  const [teamName, setTeamName] = useState('');
  const [loading, setLoading] = useState(false);

  // If already on a team, redirect
  if (profile?.team_id) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <Ionicons name='checkmark-circle' size={64} color='#22c55e' />
          <Text style={styles.title}>Already on a Team!</Text>
          <Text style={styles.subtitle}>
            You&apos;re already part of a team. Leave your current team to create a
            new one.
          </Text>
          <TouchableOpacity style={styles.button} onPress={() => router.back()}>
            <Text style={styles.buttonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const generateTeamCode = () => {
    // Generate 8-character alphanumeric code
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  const handleCreateTeam = async () => {
    if (!teamName.trim()) {
      Alert.alert('Team Name Required', 'Please enter a team name');
      return;
    }

    if (!user?.id) {
      Alert.alert('Error', 'You must be logged in to create a team');
      return;
    }

    setLoading(true);

    try {
      // Generate unique code
      let teamCode = generateTeamCode();
      let attempts = 0;
      let isUnique = false;

      // Keep trying until we get a unique code (max 10 attempts)
      while (!isUnique && attempts < 10) {
        const { data: existing, error } = await supabase
          .from('teams')
          .select('id')
          .ilike('code', teamCode);

        // If there's a database error, log it and assume the code is unique
        // (the insert will fail if there's a real conflict)
        if (error) {
          console.log('Error checking team code uniqueness:', error);
          // Assume unique and let the insert handle any conflicts
          isUnique = true;
        } else if (!existing || existing.length === 0) {
          // No existing team with this code
          isUnique = true;
        } else {
          // Code exists, generate a new one
          teamCode = generateTeamCode();
          attempts++;
        }
      }

      if (!isUnique) {
        throw new Error('Could not generate unique team code');
      }

      // Create team with user as coach
      const { data: team, error: teamError } = await supabase
        .from('teams')
        .insert({
          name: teamName.trim(),
          code: teamCode,
          coach_id: user.id,
        })
        .select()
        .single();

      if (teamError) {
        console.error('Team creation error:', teamError);
        throw teamError;
      }

      if (!team) {
        throw new Error('Team was not created');
      }

      // Update user's profile to join the team AND become a coach
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          team_id: team.id,
          is_coach: true,
          role: 'coach'
        })
        .eq('id', user.id);

      if (profileError) {
        console.error('Profile update error:', profileError);
        throw profileError;
      }

      // Refetch profile to update UI
      await refetchProfile();

      // Show success with team code
      Alert.alert(
        'Team Created! 🎉',
        `Team: ${teamName}\nTeam Code: ${teamCode}\n\nShare this code with your teammates so they can join!`,
        [
          {
            text: 'Done',
            onPress: () => router.replace('/'),
          },
        ]
      );
    } catch (error: any) {
      console.error('Error creating team:', error);
      Alert.alert('Error', error.message || 'Failed to create team');
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
            <Ionicons name='people' size={64} color='#2B9FFF' />
          </View>

          <Text style={styles.title}>Create Your Team</Text>
          <Text style={styles.subtitle}>
            Start a team and invite your friends to compete on the leaderboard!
          </Text>

          {/* Team Name Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Team Name</Text>
            <TextInput
              style={styles.input}
              placeholder='e.g., Street Ballers, Tigers FC'
              placeholderTextColor='#9CA3AF'
              value={teamName}
              onChangeText={setTeamName}
              autoCapitalize='words'
              maxLength={30}
            />
            <Text style={styles.hint}>
              Choose a name your teammates will recognize
            </Text>
          </View>

          {/* Info Cards */}
          <View style={styles.infoCard}>
            <Ionicons name='information-circle' size={24} color='#2B9FFF' />
            <View style={styles.infoContent}>
              <Text style={styles.infoTitle}>What You&apos;ll Get</Text>
              <Text style={styles.infoText}>
                • A unique team code to share{'\n'}• Team leaderboard with your
                friends{'\n'}• Track everyone&apos;s progress together
              </Text>
            </View>
          </View>

          <View style={styles.coachCard}>
            <Ionicons name='star' size={20} color='#FFA500' />
            <Text style={styles.coachText}>
              You&apos;ll become the team coach and can manage your players
            </Text>
          </View>

          {/* Create Button */}
          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleCreateTeam}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color='#FFF' />
            ) : (
              <>
                <Ionicons name='add-circle' size={24} color='#FFF' />
                <Text style={styles.buttonText}>Create Team</Text>
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
  coachCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFF7ED',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  coachText: {
    flex: 1,
    fontSize: 14,
    color: '#2C3E50',
    fontWeight: '600',
  },
  coachLink: {
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
