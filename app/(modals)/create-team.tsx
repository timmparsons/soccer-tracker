import { useProfile } from '@/hooks/useProfile';
import { useUser } from '@/hooks/useUser';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
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
  const queryClient = useQueryClient();
  const { data: user } = useUser();
  const { data: profile, refetch: refetchProfile } = useProfile(user?.id);

  const [teamName, setTeamName] = useState('');
  const [loading, setLoading] = useState(false);
  const [logoUri, setLogoUri] = useState<string | null>(null);
  const [logoBase64, setLogoBase64] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);

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

  const handlePickLogo = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission Required', 'Please allow access to your photo library.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
      base64: true,
    });
    if (!result.canceled && result.assets[0]) {
      setLogoUri(result.assets[0].uri);
      setLogoBase64(result.assets[0].base64 ?? null);
    }
  };

  const uploadLogo = async (teamId: string): Promise<string | null> => {
    if (!logoBase64) return null;
    setUploadingLogo(true);
    try {
      const binaryString = atob(logoBase64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const filePath = `team-logos/${teamId}-${Date.now()}.jpg`;
      const { error } = await supabase.storage
        .from('avatars')
        .upload(filePath, bytes, { contentType: 'image/jpeg', upsert: true });
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath);
      return publicUrl;
    } catch {
      return null;
    } finally {
      setUploadingLogo(false);
    }
  };

  const generateTeamCode = () => {
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
      let teamCode = generateTeamCode();
      let attempts = 0;
      let isUnique = false;

      while (!isUnique && attempts < 10) {
        const { data: existing, error } = await supabase
          .from('teams')
          .select('id')
          .ilike('code', teamCode);
        if (error || !existing || existing.length === 0) {
          isUnique = true;
        } else {
          teamCode = generateTeamCode();
          attempts++;
        }
      }

      const { data: team, error: teamError } = await supabase
        .from('teams')
        .insert({ name: teamName.trim(), code: teamCode, coach_id: user.id })
        .select()
        .single();

      if (teamError || !team) throw teamError ?? new Error('Team was not created');

      const logoUrl = await uploadLogo(team.id);
      if (logoUrl) {
        await supabase.from('teams').update({ logo_url: logoUrl }).eq('id', team.id);
      }

      queryClient.invalidateQueries({ queryKey: ['coach-teams', user.id] });

      const { error: profileError } = await supabase
        .from('profiles')
        .update({ team_id: team.id })
        .eq('id', user.id);
      if (profileError) throw profileError;
      await refetchProfile();

      Alert.alert(
        'Team Created!',
        `Team: ${teamName}\nCode: ${teamCode}\n\nShare this code with players so they can join!`,
        [{ text: 'Done', onPress: () => router.replace('/') }],
      );
    } catch (error: any) {
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
          showsVerticalScrollIndicator={false}
        >
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name='arrow-back' size={24} color='#2C3E50' />
          </TouchableOpacity>

          {/* Editable team logo */}
          <TouchableOpacity
            style={styles.logoContainer}
            onPress={handlePickLogo}
            activeOpacity={0.8}
            disabled={uploadingLogo}
          >
            {logoUri ? (
              <Image source={{ uri: logoUri }} style={styles.logoImage} />
            ) : (
              <Ionicons name='people' size={36} color='#1f89ee' />
            )}
            <View style={styles.logoCameraBadge}>
              <Ionicons name='camera' size={13} color='#FFF' />
            </View>
          </TouchableOpacity>

          <Text style={styles.title}>Create Your Team</Text>
          <Text style={styles.subtitle}>
            Start a team and invite players to compete on the leaderboard.
          </Text>

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
          </View>

          <View style={styles.infoCard}>
            <Ionicons name='information-circle' size={22} color='#1f89ee' />
            <View style={styles.infoContent}>
              <Text style={styles.infoTitle}>What You'll Get</Text>
              <Text style={styles.infoText}>
                {'• A unique team code to share\n• Team leaderboard\n• Track everyone\'s progress'}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.button, (loading || uploadingLogo) && styles.buttonDisabled]}
            onPress={handleCreateTeam}
            disabled={loading || uploadingLogo}
          >
            {loading || uploadingLogo ? (
              <ActivityIndicator color='#FFF' />
            ) : (
              <>
                <Ionicons name='add-circle' size={22} color='#FFF' />
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
    paddingBottom: 32,
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
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(43, 159, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 16,
  },
  logoImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  logoCameraBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#1f89ee',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#F5F9FF',
  },
  title: {
    fontSize: 26,
    fontWeight: '900',
    color: '#2C3E50',
    marginBottom: 6,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
    fontWeight: '500',
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '800',
    color: '#2C3E50',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: '#FFF',
    borderRadius: 14,
    padding: 16,
    fontSize: 16,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    fontWeight: '600',
    color: '#2C3E50',
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
    gap: 12,
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
    fontSize: 14,
    fontWeight: '800',
    color: '#2C3E50',
    marginBottom: 6,
  },
  infoText: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 20,
    fontWeight: '500',
  },
  button: {
    flexDirection: 'row',
    backgroundColor: '#ffb724',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
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
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
});
