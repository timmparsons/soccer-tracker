import { supabase } from '@/lib/supabase';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ConfirmScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>(
    'loading'
  );

  useEffect(() => {
    verifyEmail();
  }, []);

  const verifyEmail = async () => {
    try {
      const token_hash = params.token_hash as string;
      const type = params.type as string;

      console.log('Confirming email with:', { token_hash, type });

      if (!token_hash) {
        setStatus('error');
        return;
      }

      if (type === 'signup') {
        const { data, error } = await supabase.auth.verifyOtp({
          token_hash,
          type: 'email',
        });

        if (error) {
          console.error('Verification error:', error);
          setStatus('error');
          return;
        }

        console.log('Email verified successfully');
        setStatus('success');

        // Wait a moment to show success, then redirect
        setTimeout(() => {
          router.replace('/(tabs)');
        }, 1500);
      }
    } catch (err) {
      console.error('Verification exception:', err);
      setStatus('error');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {status === 'loading' && (
          <>
            <ActivityIndicator size='large' color='#FFA500' />
            <Text style={styles.text}>Verifying your email...</Text>
          </>
        )}
        {status === 'success' && (
          <>
            <Text style={styles.emoji}>✅</Text>
            <Text style={styles.successText}>Email verified!</Text>
            <Text style={styles.subText}>Taking you to the app...</Text>
          </>
        )}
        {status === 'error' && (
          <>
            <Text style={styles.emoji}>❌</Text>
            <Text style={styles.errorText}>Verification failed</Text>
            <Text style={styles.subText}>Please try signing up again.</Text>
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
  text: {
    fontSize: 18,
    color: '#2C3E50',
    marginTop: 20,
    fontWeight: '600',
  },
  emoji: {
    fontSize: 80,
    marginBottom: 20,
  },
  successText: {
    fontSize: 24,
    fontWeight: '900',
    color: '#2C3E50',
    marginBottom: 10,
  },
  errorText: {
    fontSize: 24,
    fontWeight: '900',
    color: '#FF4444',
    marginBottom: 10,
  },
  subText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
});
