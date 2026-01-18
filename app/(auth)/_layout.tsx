import { supabase } from '@/lib/supabase';
import * as Linking from 'expo-linking';
import { Stack, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Alert } from 'react-native';

export default function AuthLayout() {
  const router = useRouter();

  useEffect(() => {
    // Handle deep links when app is already open
    const subscription = Linking.addEventListener('url', ({ url }) => {
      handleDeepLink(url);
    });

    // Handle deep link that opened the app
    Linking.getInitialURL().then((url) => {
      if (url) handleDeepLink(url);
    });

    return () => subscription.remove();
  }, []);

  const handleDeepLink = async (url: string) => {
    console.log('Deep link received:', url);

    const { path, queryParams } = Linking.parse(url);
    console.log('Parsed path:', path);
    console.log('Query params:', queryParams);

    // Handle email confirmation for signup
    if (
      path === 'auth/confirm' &&
      queryParams?.token_hash &&
      queryParams?.type === 'signup'
    ) {
      try {
        const { data, error } = await supabase.auth.verifyOtp({
          token_hash: queryParams.token_hash as string,
          type: 'email',
        });

        if (error) {
          console.error('Verification error:', error);
          Alert.alert('Error', 'Failed to verify email. Please try again.');
          return;
        }

        console.log('Email verified successfully:', data);
        // Successfully confirmed - root layout will handle routing to onboarding or tabs
        router.replace('/(tabs)');
      } catch (err) {
        console.error('Verification exception:', err);
        Alert.alert('Error', 'Something went wrong. Please try again.');
      }
    }

    // Handle password recovery
    if (
      path === 'auth/confirm' &&
      queryParams?.type === 'recovery' &&
      queryParams?.token_hash
    ) {
      router.push({
        pathname: '/reset-password',
        params: { token: queryParams.token_hash as string },
      });
    }
  };

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name='index' options={{ headerShown: false }} />
      <Stack.Screen name='confirm' options={{ headerShown: false }} />
    </Stack>
  );
}
