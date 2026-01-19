import { useUpdateProfile } from '@/hooks/useUpdateProfile';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
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

      // ✅ STEP 1: Create auth user WITH METADATA
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: firstName.trim() || null,
            last_name: lastName.trim() || null,
            role,
            team_code: teamCode.trim() || null,
          },
        },
      });

      console.log('[Auth] signUp response', data);

      if (error) throw error;
      if (!data.user) throw new Error('User creation failed');

      // ❌ REMOVED:
      // - setTimeout
      // - profiles.update
      // - team lookup
      // These cannot work before email confirmation

      Alert.alert(
        'Check your inbox',
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
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'exp://192.168.0.227:8081/--/callback',
      });
      if (error) throw error;
      Alert.alert('Check email', 'Password reset link sent.');
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  };

  // ---------------------------------------------------------------------
  // UI
  // ---------------------------------------------------------------------
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* HEADER */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Image
              source={require('../assets/images/app-logo-transparent.png')}
              style={styles.logo}
            />
          </View>

          <Text style={styles.title}>
            {mode === 'signin' ? 'Welcome Back' : 'Join the Team'}
          </Text>

          <Text style={styles.subtitle}>
            {mode === 'signin'
              ? 'Log in to continue your training'
              : 'Start your juggling journey today'}
          </Text>
        </View>

        {/* FORM CARD */}
        <View style={styles.card}>
          <View style={styles.inputContainer}>
            <View style={styles.inputIconContainer}>
              <Ionicons name='mail-outline' size={20} color='#6B7280' />
            </View>
            <TextInput
              placeholder='Email'
              autoCapitalize='none'
              value={email}
              onChangeText={setEmail}
              style={styles.input}
              placeholderTextColor='#9CA3AF'
            />
          </View>

          <View style={styles.inputContainer}>
            <View style={styles.inputIconContainer}>
              <Ionicons name='lock-closed-outline' size={20} color='#6B7280' />
            </View>
            <TextInput
              placeholder='Password'
              secureTextEntry
              autoCapitalize='none'
              value={password}
              onChangeText={setPassword}
              style={styles.input}
              placeholderTextColor='#9CA3AF'
            />
          </View>

          {mode === 'signup' && (
            <>
              <View style={styles.inputContainer}>
                <View style={styles.inputIconContainer}>
                  <Ionicons name='person-outline' size={20} color='#6B7280' />
                </View>
                <TextInput
                  placeholder='First Name'
                  autoCapitalize='words'
                  value={firstName}
                  onChangeText={setFirstName}
                  style={styles.input}
                  placeholderTextColor='#9CA3AF'
                />
              </View>

              <View style={styles.inputContainer}>
                <View style={styles.inputIconContainer}>
                  <Ionicons name='person-outline' size={20} color='#6B7280' />
                </View>
                <TextInput
                  placeholder='Last Name (optional)'
                  autoCapitalize='words'
                  value={lastName}
                  onChangeText={setLastName}
                  style={styles.input}
                  placeholderTextColor='#9CA3AF'
                />
              </View>

              {/* <View style={styles.inputContainer}>
                <View style={styles.inputIconContainer}>
                  <Ionicons name='people-outline' size={20} color='#6B7280' />
                </View>
                <TextInput
                  placeholder='Team Code (optional)'
                  autoCapitalize='none'
                  value={teamCode}
                  onChangeText={setTeamCode}
                  style={styles.input}
                  placeholderTextColor='#9CA3AF'
                />
              </View> */}
            </>
          )}

          <TouchableOpacity
            style={[
              styles.button,
              mode === 'signin' ? styles.signInButton : styles.signUpButton,
            ]}
            onPress={mode === 'signin' ? signIn : signUp}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color='#fff' />
            ) : (
              <Text style={styles.buttonText}>
                {mode === 'signin' ? 'Sign In' : 'Create Account'}
              </Text>
            )}
          </TouchableOpacity>

          {mode === 'signin' && (
            <TouchableOpacity
              onPress={resetPassword}
              style={styles.forgotButton}
            >
              <Text style={styles.forgotLink}>Forgot Password?</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* SWITCH MODE */}
        <TouchableOpacity onPress={toggleMode} style={styles.switchContainer}>
          <Text style={styles.switchText}>
            {mode === 'signin'
              ? "Don't have an account? "
              : 'Already have an account? '}
            <Text style={styles.switchLink}>
              {mode === 'signin' ? 'Sign Up' : 'Sign In'}
            </Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F9FF',
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },

  // HEADER
  header: {
    marginTop: 40,
    alignItems: 'center',
    marginBottom: 32,
  },
  logoContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#2B9FFF',
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  logo: {
    width: 80,
    height: 80,
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    color: '#2C3E50',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    fontWeight: '500',
  },

  // FORM CARD
  card: {
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },

  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F9FF',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  inputIconContainer: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
    color: '#2C3E50',
    fontWeight: '600',
  },

  button: {
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  signInButton: {
    backgroundColor: '#2B9FFF',
  },
  signUpButton: {
    backgroundColor: '#FFA500',
  },
  buttonText: {
    color: '#FFF',
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: 0.5,
  },

  forgotButton: {
    marginTop: 16,
    alignSelf: 'center',
  },
  forgotLink: {
    color: '#2B9FFF',
    fontSize: 14,
    fontWeight: '700',
  },

  // SWITCH MODE
  switchContainer: {
    marginTop: 24,
    alignItems: 'center',
  },
  switchText: {
    textAlign: 'center',
    fontSize: 15,
    color: '#6B7280',
    fontWeight: '500',
  },
  switchLink: {
    color: '#2B9FFF',
    fontWeight: '900',
  },
});
