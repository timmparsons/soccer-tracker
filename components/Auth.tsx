import { useUpdateProfile } from '@/hooks/useUpdateProfile';
import { supabase } from '@/lib/supabase';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function Auth() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [role, setRole] = useState<'player' | 'coach'>('player');
  const [teamCode, setTeamCode] = useState('');

  const [loading, setLoading] = useState(false);

  const updateProfile = useUpdateProfile();

  const toggleMode = () =>
    setMode((prev) => (prev === 'signin' ? 'signup' : 'signin'));

  // ---------------------------------------------------------------------
  // SIGN IN
  // ---------------------------------------------------------------------
  const signIn = async () => {
    try {
      setLoading(true);

      console.log('[Auth] signIn →', { email });

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      console.log('[Auth] signIn response:', data);

      // First-time login immediately after signup? Complete profile now.
      const userId = data.user?.id;
      if (mode === 'signup' && userId) {
        const displayName =
          lastName.trim().length > 0
            ? `${firstName.trim()} ${lastName.trim()[0].toUpperCase()}.`
            : firstName.trim();

        console.log('[Auth] updateProfile after signup →', {
          user_id: userId,
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          display_name: displayName,
          role,
          team_code: teamCode.trim(),
        });

        await updateProfile.mutateAsync({
          user_id: userId,
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          display_name: displayName,
          role,
          team_code: teamCode.trim(),
        });
      }
    } catch (err: any) {
      console.log('[Auth] signIn error:', err);
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  // ---------------------------------------------------------------------
  // SIGN UP
  // ---------------------------------------------------------------------
  const signUp = async () => {
    try {
      setLoading(true);

      console.log('[Auth] signUp start', {
        email,
        firstName,
        lastName,
        role,
        teamCode,
      });

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      console.log('[Auth] signUp response', data);

      if (error) throw error;

      Alert.alert(
        'Check your inbox 📩',
        'Please confirm your email before signing in.'
      );
    } catch (err: any) {
      console.log('[Auth] signUp caught error', err);
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  // ---------------------------------------------------------------------
  // RESET PASSWORD
  // ---------------------------------------------------------------------
  const resetPassword = async () => {
    if (!email) return Alert.alert('Enter your email first');

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) throw error;
      Alert.alert('Check email 📩', 'Password reset link sent.');
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  };

  // ---------------------------------------------------------------------
  // UI
  // ---------------------------------------------------------------------
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Image
          source={require('../assets/images/app-logo-transparent.png')}
          style={{ width: 80, height: 80 }}
        />

        <Text style={styles.title}>
          {mode === 'signin' ? 'Welcome Back' : 'Create an Account'}
        </Text>

        <Text style={styles.subtitle}>
          {mode === 'signin'
            ? 'Log in to continue your training'
            : 'Join and start your juggling journey!'}
        </Text>
      </View>

      <View style={styles.card}>
        <TextInput
          placeholder='Email'
          autoCapitalize='none'
          value={email}
          onChangeText={setEmail}
          style={styles.input}
        />

        <TextInput
          placeholder='Password'
          secureTextEntry
          autoCapitalize='none'
          value={password}
          onChangeText={setPassword}
          style={styles.input}
        />

        {mode === 'signup' && (
          <>
            <TextInput
              placeholder='First Name'
              autoCapitalize='words'
              value={firstName}
              onChangeText={setFirstName}
              style={styles.input}
            />

            <TextInput
              placeholder='Last Name (optional)'
              autoCapitalize='words'
              value={lastName}
              onChangeText={setLastName}
              style={styles.input}
            />

            {/* <View style={styles.roleRow}>
              <TouchableOpacity
                style={[
                  styles.roleButton,
                  role === 'player' && styles.roleSelected,
                ]}
                onPress={() => setRole('player')}
              >
                <Text
                  style={[
                    styles.roleText,
                    role === 'player' && styles.roleTextSelected,
                  ]}
                >
                  Player
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.roleButton,
                  role === 'coach' && styles.roleSelected,
                ]}
                onPress={() => setRole('coach')}
              >
                <Text
                  style={[
                    styles.roleText,
                    role === 'coach' && styles.roleTextSelected,
                  ]}
                >
                  Coach
                </Text>
              </TouchableOpacity>
            </View> */}

            <TextInput
              placeholder='Team Code (optional)'
              autoCapitalize='none'
              value={teamCode}
              onChangeText={setTeamCode}
              style={styles.input}
            />
          </>
        )}

        <TouchableOpacity
          style={[
            styles.button,
            mode === 'signin' ? styles.signInButton : styles.signUpButton,
          ]}
          onPress={mode === 'signin' ? signIn : signUp}
        >
          {loading ? (
            <ActivityIndicator color='#fff' />
          ) : (
            <Text style={styles.buttonText}>
              {mode === 'signin' ? 'Sign In' : 'Sign Up'}
            </Text>
          )}
        </TouchableOpacity>

        {mode === 'signin' && (
          <TouchableOpacity
            onPress={resetPassword}
            style={{ marginTop: 12, alignSelf: 'center' }}
          >
            <Text style={styles.forgotLink}>Forgot Password?</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity onPress={toggleMode} style={{ marginTop: 18 }}>
          <Text style={styles.switchText}>
            {mode === 'signin'
              ? "Don't have an account? "
              : 'Already have an account? '}
            <Text style={styles.switchLink}>
              {mode === 'signin' ? 'Sign Up' : 'Sign In'}
            </Text>
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
    paddingHorizontal: 24,
  },

  header: {
    marginTop: 60,
    alignItems: 'center',
    marginBottom: 30,
  },

  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    marginTop: 10,
  },

  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
    textAlign: 'center',
  },

  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    paddingBottom: 30,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 4,
  },

  input: {
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontSize: 16,
    color: '#111827',
    marginBottom: 16,
  },

  roleRow: {
    flexDirection: 'row',
    marginBottom: 16,
    justifyContent: 'space-between',
  },

  roleButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#d1d5db',
    marginHorizontal: 4,
    alignItems: 'center',
  },

  roleSelected: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },

  roleText: {
    fontSize: 16,
    color: '#6b7280',
  },

  roleTextSelected: {
    color: '#fff',
    fontWeight: '700',
  },

  button: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
  },

  signInButton: { backgroundColor: '#3b82f6' },
  signUpButton: { backgroundColor: '#10b981' },

  buttonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },

  forgotLink: {
    color: '#3b82f6',
    fontSize: 14,
    fontWeight: '600',
  },

  switchText: {
    textAlign: 'center',
    fontSize: 14,
    color: '#6b7280',
  },

  switchLink: {
    color: '#3b82f6',
    fontWeight: '700',
  },

  footer: {
    marginTop: 20,
    paddingBottom: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },

  footerText: {
    fontSize: 13,
    color: '#6b7280',
    textAlign: 'center',
    paddingHorizontal: 20,
  },

  footerLink: {
    color: '#3b82f6',
    fontWeight: '600',
  },
});
