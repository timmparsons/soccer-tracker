import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
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

export default function Auth() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');

  const [loading, setLoading] = useState(false);

  const toggleMode = () =>
    setMode((prev) => (prev === 'signin' ? 'signup' : 'signin'));

  // SIGN IN
  const signIn = async () => {
    if (!email || !password) {
      Alert.alert('Missing Fields', 'Please enter your email and password');
      return;
    }

    try {
      setLoading(true);

      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) throw error;
    } catch (err: any) {
      Alert.alert('Sign In Failed', err.message);
    } finally {
      setLoading(false);
    }
  };

  // SIGN UP
  const signUp = async () => {
    if (!email || !password) {
      Alert.alert('Missing Fields', 'Please enter your email and password');
      return;
    }

    if (!firstName.trim()) {
      Alert.alert('Missing Name', 'Please enter your first name');
      return;
    }

    try {
      setLoading(true);

      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            first_name: firstName.trim(),
            last_name: lastName.trim() || null,
          },
        },
      });

      if (error) throw error;
      if (!data.user) throw new Error('User creation failed');

      // User is automatically signed in - auth state listener will redirect
    } catch (err: any) {
      Alert.alert('Sign Up Failed', err.message);
    } finally {
      setLoading(false);
    }
  };

  // RESET PASSWORD
  const resetPassword = async () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      Alert.alert('Enter Email', 'Please enter your email address first');
      return;
    }

    try {
      setLoading(true);
      const { error } = await supabase.auth.resetPasswordForEmail(trimmedEmail, {
        redirectTo: 'mastertouch://auth/reset-password',
      });
      if (error) throw error;
      Alert.alert('Check Your Email', 'Password reset link has been sent.');
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* HEADER */}
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <View style={styles.logoCircle}>
                <Image
                  source={require('../assets/images/app-logo-transparent.png')}
                  style={styles.logo}
                />
              </View>
            </View>

            <Text style={styles.title}>
              {mode === 'signin' ? 'Welcome Back!' : 'Join the Team'}
            </Text>

            <Text style={styles.subtitle}>
              {mode === 'signin'
                ? 'Log in to track your progress'
                : 'Start building your skills today'}
            </Text>
          </View>

          {/* FORM CARD */}
          <View style={styles.card}>
            {/* Email */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="mail-outline" size={20} color="#78909C" />
                <TextInput
                  placeholder="Enter your email"
                  autoCapitalize="none"
                  keyboardType="email-address"
                  value={email}
                  onChangeText={setEmail}
                  style={styles.input}
                  placeholderTextColor="#B0BEC5"
                />
              </View>
            </View>

            {/* Password */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Password</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="lock-closed-outline" size={20} color="#78909C" />
                <TextInput
                  placeholder="Enter your password"
                  secureTextEntry
                  autoCapitalize="none"
                  value={password}
                  onChangeText={setPassword}
                  style={styles.input}
                  placeholderTextColor="#B0BEC5"
                />
              </View>
            </View>

            {/* Sign Up Fields */}
            {mode === 'signup' && (
              <>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>First Name</Text>
                  <View style={styles.inputContainer}>
                    <Ionicons name="person-outline" size={20} color="#78909C" />
                    <TextInput
                      placeholder="Enter your first name"
                      autoCapitalize="words"
                      value={firstName}
                      onChangeText={setFirstName}
                      style={styles.input}
                      placeholderTextColor="#B0BEC5"
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Last Name (Optional)</Text>
                  <View style={styles.inputContainer}>
                    <Ionicons name="person-outline" size={20} color="#78909C" />
                    <TextInput
                      placeholder="Enter your last name"
                      autoCapitalize="words"
                      value={lastName}
                      onChangeText={setLastName}
                      style={styles.input}
                      placeholderTextColor="#B0BEC5"
                    />
                  </View>
                </View>
              </>
            )}

            {/* Submit Button */}
            <TouchableOpacity
              style={styles.submitButton}
              onPress={mode === 'signin' ? signIn : signUp}
              disabled={loading}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={mode === 'signin' ? ['#2B9FFF', '#7E57C2'] : ['#FF7043', '#FF5722']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.submitButtonGradient}
              >
                {loading ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.submitButtonText}>
                    {mode === 'signin' ? 'Sign In' : 'Create Account'}
                  </Text>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {/* Forgot Password */}
            {mode === 'signin' && (
              <TouchableOpacity
                onPress={resetPassword}
                style={styles.forgotButton}
                disabled={loading}
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
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
    flexGrow: 1,
    justifyContent: 'center',
  },

  // HEADER
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoContainer: {
    marginBottom: 24,
  },
  logoCircle: {
    width: 110,
    height: 110,
    borderRadius: 55,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  logo: {
    width: 70,
    height: 70,
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    color: '#1a1a2e',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#78909C',
    textAlign: 'center',
    fontWeight: '600',
  },

  // FORM CARD
  card: {
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8,
  },

  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1a1a2e',
    marginBottom: 8,
    marginLeft: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F7FA',
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#E8EAF6',
    paddingHorizontal: 16,
    gap: 12,
  },
  input: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 16,
    color: '#1a1a2e',
    fontWeight: '600',
  },

  submitButton: {
    marginTop: 8,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#2B9FFF',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  submitButtonGradient: {
    paddingVertical: 18,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 0.5,
  },

  forgotButton: {
    marginTop: 20,
    alignSelf: 'center',
  },
  forgotLink: {
    color: '#2B9FFF',
    fontSize: 15,
    fontWeight: '700',
  },

  switchContainer: {
    marginTop: 28,
    alignItems: 'center',
  },
  switchText: {
    textAlign: 'center',
    fontSize: 15,
    color: '#78909C',
    fontWeight: '600',
  },
  switchLink: {
    color: '#2B9FFF',
    fontWeight: '900',
  },
});
