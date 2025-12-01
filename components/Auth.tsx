import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
  const [loading, setLoading] = useState(false);

  const toggleMode = () => {
    setMode(mode === 'signin' ? 'signup' : 'signin');
  };

  const signIn = async () => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;

      Alert.alert('Success', 'Signed in!');
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  const signUp = async () => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signUp({
        email,
        password,
      });
      if (error) throw error;

      Alert.alert(
        'Check your inbox 📩',
        'Confirm your email before signing in.'
      );
    } catch (err: any) {
      console.log('Sign Up Error:', err);
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <Ionicons name='football-outline' size={48} color='#3b82f6' />

        <Text style={styles.title}>
          {mode === 'signin' ? 'Welcome Back' : 'Create an Account'}
        </Text>

        <Text style={styles.subtitle}>
          {mode === 'signin'
            ? 'Log in to continue your training'
            : 'Join and start your juggling journey!'}
        </Text>
      </View>

      {/* AUTH CARD */}
      <View style={styles.card}>
        <TextInput
          placeholder='Email'
          placeholderTextColor='#9ca3af'
          autoCapitalize='none'
          value={email}
          onChangeText={setEmail}
          style={styles.input}
        />

        <TextInput
          placeholder='Password'
          placeholderTextColor='#9ca3af'
          secureTextEntry
          autoCapitalize='none'
          value={password}
          onChangeText={setPassword}
          style={styles.input}
        />

        {mode === 'signin' ? (
          <TouchableOpacity
            style={[styles.button, styles.signInButton]}
            disabled={loading}
            onPress={signIn}
          >
            {loading ? (
              <ActivityIndicator color='#fff' />
            ) : (
              <Text style={styles.buttonText}>Sign In</Text>
            )}
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.button, styles.signUpButton]}
            disabled={loading}
            onPress={signUp}
          >
            {loading ? (
              <ActivityIndicator color='#fff' />
            ) : (
              <Text style={styles.buttonText}>Sign Up</Text>
            )}
          </TouchableOpacity>
        )}

        {/* Mode Switch Link */}
        <TouchableOpacity onPress={toggleMode} style={{ marginTop: 14 }}>
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

      {/* FOOTER */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          By signing up, you agree to our{' '}
          <Text style={styles.footerLink}>Terms</Text> &{' '}
          <Text style={styles.footerLink}>Privacy Policy</Text>.
        </Text>
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

  button: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
  },

  signInButton: {
    backgroundColor: '#3b82f6',
  },

  signUpButton: {
    backgroundColor: '#10b981',
  },

  buttonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
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
