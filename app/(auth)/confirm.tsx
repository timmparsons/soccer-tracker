import { supabase } from '@/lib/supabase';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ConfirmScreen() {
  const { token_hash, type } = useLocalSearchParams<{
    token_hash?: string;
    type?: string;
  }>();
  const router = useRouter();

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>(
    'loading'
  );
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    confirmEmail();
  }, [token_hash, type]);

  const confirmEmail = async () => {
    if (!token_hash || type !== 'signup') {
      setErrorMessage('Invalid or expired confirmation link.');
      setStatus('error');
      return;
    }

    const { data: verifyData, error } = await supabase.auth.verifyOtp({
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

    console.log('✅ Email verified successfully!');

    // Sync user metadata to profile after confirmation
    if (verifyData.user) {
      const metadata = verifyData.user.user_metadata;
      const firstName = metadata?.first_name;
      const lastName = metadata?.last_name;

      if (firstName) {
        const fullName = [firstName, lastName].filter(Boolean).join(' ').trim();

        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            name: fullName,
            display_name: firstName,
          })
          .eq('id', verifyData.user.id);

        if (profileError) {
          console.error('❌ Failed to update profile with name:', profileError);
        } else {
          console.log('✅ Profile updated with display_name:', firstName);
        }
      }
    }

    setStatus('success');

    // ✅ DO NOT ROUTE MANUALLY
    // Root layout will handle onboarding vs tabs
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
            <Text style={styles.successEmoji}>✅</Text>
            <Text style={styles.successTitle}>Email Verified!</Text>
            <Text style={styles.successSubtitle}>
              Redirecting you to the app...
            </Text>
          </>
        )}

        {status === 'error' && (
          <>
            <Text style={styles.errorEmoji}>❌</Text>
            <Text style={styles.errorTitle}>Verification Failed</Text>
            <Text style={styles.errorMessage}>{errorMessage}</Text>
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
    lineHeight: 24,
  },
});
