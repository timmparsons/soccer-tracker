import { supabase } from '@/lib/supabase';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ConfirmScreen() {
  const { token_hash, type } = useLocalSearchParams<{
    token_hash?: string;
    type?: string;
  }>();

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>(
    'loading'
  );
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    confirmEmail();
  }, [token_hash, type]);

  const confirmEmail = async () => {
    // Guard: missing params
    if (!token_hash || type !== 'signup') {
      setErrorMessage('Invalid or expired confirmation link.');
      setStatus('error');
      return;
    }

    const { error } = await supabase.auth.verifyOtp({
      token_hash,
      type: 'email',
    });

    if (error) {
      console.error('❌ Email confirmation failed:', error.message);
      setErrorMessage(
        'This confirmation link has expired or already been used.'
      );
      setStatus('error');
      return;
    }

    // ✅ Success
    console.log('✅ Email verified successfully!');
    setStatus('success');

    // Wait a moment to show success, then redirect
    setTimeout(() => {
      router.replace('/(tabs)');
    }, 1500);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.content}>
        {status === 'loading' && (
          <>
            <ActivityIndicator size='large' color='#FFA500' />
            <Text style={styles.loadingText}>Confirming your email...</Text>
          </>
        )}

        {status === 'success' && (
          <>
            <View style={styles.successCircle}>
              <Text style={styles.successEmoji}>✅</Text>
            </View>
            <Text style={styles.successTitle}>Email Verified!</Text>
            <Text style={styles.successSubtitle}>Taking you to the app...</Text>
          </>
        )}

        {status === 'error' && (
          <>
            <View style={styles.errorCircle}>
              <Text style={styles.errorEmoji}>❌</Text>
            </View>
            <Text style={styles.errorTitle}>Verification Failed</Text>
            <Text style={styles.errorMessage}>{errorMessage}</Text>

            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.replace('/(auth)')}
            >
              <Text style={styles.backButtonText}>Back to Sign In</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F9FF',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  loadingText: {
    fontSize: 18,
    color: '#2C3E50',
    marginTop: 20,
    fontWeight: '600',
  },
  successCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(46, 204, 113, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  successEmoji: {
    fontSize: 64,
  },
  successTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#2C3E50',
    marginBottom: 12,
  },
  successSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  errorCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(231, 76, 60, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  errorEmoji: {
    fontSize: 64,
  },
  errorTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#2C3E50',
    marginBottom: 12,
  },
  errorMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  backButton: {
    backgroundColor: '#1E90FF',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 32,
    shadowColor: '#1E90FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  backButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
});
