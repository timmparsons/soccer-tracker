import { findTeamByCode, JoinableTeam, useJoinTeam } from '@/hooks/useJoinTeam';
import { useProfile } from '@/hooks/useProfile';
import { TeamResult, useTeamSearch } from '@/hooks/useTeamSearch';
import { useUser } from '@/hooks/useUser';
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

export default function JoinTeam() {
  const router = useRouter();
  const { data: user } = useUser();
  const { data: profile, refetch: refetchProfile } = useProfile(user?.id);
  const { mutateAsync: joinTeam } = useJoinTeam(user?.id);

  const [search, setSearch] = useState('');
  const [teamCode, setTeamCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [justJoined, setJustJoined] = useState(false);

  const { data: teams = [], isFetching: searching } = useTeamSearch(search, profile?.club_id);

  // If already on a team (and didn't just join), show message
  if (profile?.team_id && !justJoined) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <Ionicons name='checkmark-circle' size={64} color='#22c55e' />
          <Text style={styles.title}>Already on a Team!</Text>
          <Text style={styles.subtitle}>
            You&apos;re already part of a team. Leave your current team to join a
            different one.
          </Text>
          <TouchableOpacity style={styles.button} onPress={() => router.back()}>
            <Text style={styles.buttonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const join = async (team: JoinableTeam) => {
    setLoading(true);
    try {
      // Mark as just joined to prevent "Already on a Team" screen from showing
      setJustJoined(true);
      await joinTeam(team);
      await refetchProfile();
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
    } catch (error: unknown) {
      setJustJoined(false);
      console.error('Error joining team:', error);
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to join team');
    } finally {
      setLoading(false);
    }
  };

  const handlePickTeam = (team: TeamResult) => {
    Alert.alert(`Join ${team.name}?`, team.club_name ?? undefined, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Join', onPress: () => join(team) },
    ]);
  };

  const handleJoinByCode = async () => {
    if (!teamCode.trim()) {
      Alert.alert('Team Code Required', 'Please enter a team code');
      return;
    }

    setLoading(true);
    const team = await findTeamByCode(teamCode);
    if (!team) {
      setLoading(false);
      Alert.alert(
        'Invalid Code',
        "That team code doesn't exist. Check the code and try again."
      );
      return;
    }
    await join(team);
  };

  const showNoResults = search.trim().length >= 2 && teams.length === 0 && !searching;

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
            <Ionicons name='enter' size={64} color='#1f89ee' />
          </View>

          <Text style={styles.title}>Join a Team</Text>
          <Text style={styles.subtitle}>
            Search for your team, or enter the code your coach shared
          </Text>

          {/* Team Search */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Find Your Team</Text>
            <View style={styles.searchRow}>
              <Ionicons name='search-outline' size={20} color='#78909C' />
              <TextInput
                style={styles.searchInput}
                placeholder='Search team name...'
                placeholderTextColor='#9CA3AF'
                value={search}
                onChangeText={setSearch}
                autoCorrect={false}
                returnKeyType='search'
              />
              {searching && <ActivityIndicator size='small' color='#1f89ee' />}
            </View>

            {showNoResults && (
              <Text style={styles.hint}>No teams found for &quot;{search.trim()}&quot;</Text>
            )}

            {teams.map((team) => (
              <TouchableOpacity
                key={team.id}
                style={styles.teamRow}
                onPress={() => handlePickTeam(team)}
                disabled={loading}
                activeOpacity={0.8}
              >
                <View style={styles.teamRowText}>
                  <Text style={styles.teamName} numberOfLines={1}>{team.name}</Text>
                  {team.club_name && (
                    <Text style={styles.teamClub} numberOfLines={1}>{team.club_name}</Text>
                  )}
                </View>
                <Text style={styles.teamJoin}>Join</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.orRow}>
            <View style={styles.orLine} />
            <Text style={styles.orText}>or</Text>
            <View style={styles.orLine} />
          </View>

          {/* Team Code Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Have a Code?</Text>
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
          </View>

          {/* Join Button */}
          <TouchableOpacity
            style={[styles.button, styles.codeButton, loading && styles.buttonDisabled]}
            onPress={handleJoinByCode}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color='#FFF' />
            ) : (
              <>
                <Ionicons name='checkmark-circle' size={24} color='#FFF' />
                <Text style={styles.buttonText}>Join with Code</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Info Cards */}
          <View style={styles.infoCard}>
            <Ionicons name='information-circle' size={24} color='#1f89ee' />
            <View style={styles.infoContent}>
              <Text style={styles.infoTitle}>What Happens Next</Text>
              <Text style={styles.infoText}>
                • You&apos;ll join your team&apos;s leaderboard{'\n'}• See your teammates&apos;
                progress{'\n'}• Compete together and track improvement
              </Text>
            </View>
          </View>

          <View style={styles.helpCard}>
            <Ionicons name='help-circle' size={20} color='#6B7280' />
            <View style={styles.helpContent}>
              <Text style={styles.helpTitle}>Can&apos;t find your team?</Text>
              <Text style={styles.helpText}>
                Ask your coach for the team code, or{' '}
                <Text
                  style={styles.helpLink}
                  onPress={() => router.push('/create-team')}
                >
                  create your own team
                </Text>
              </Text>
            </View>
          </View>
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
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFF',
    borderRadius: 16,
    paddingHorizontal: 16,
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  searchInput: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
  },
  teamRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginTop: 10,
    gap: 12,
    borderWidth: 1,
    borderColor: '#EEF2F6',
  },
  teamRowText: {
    flex: 1,
  },
  teamName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#2C3E50',
  },
  teamClub: {
    fontSize: 13,
    fontWeight: '600',
    color: '#78909C',
    marginTop: 2,
  },
  teamJoin: {
    fontSize: 15,
    fontWeight: '900',
    color: '#1f89ee',
  },
  orRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 24,
  },
  orLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  orText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#9CA3AF',
  },
  codeButton: {
    marginBottom: 24,
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
    color: '#1f89ee',
    fontWeight: '800',
    textDecorationLine: 'underline',
  },
  button: {
    flexDirection: 'row',
    backgroundColor: '#ffb724',
    paddingVertical: 18,
    paddingHorizontal: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    shadowColor: '#ffb724',
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
