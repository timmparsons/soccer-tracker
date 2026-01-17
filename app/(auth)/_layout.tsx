import { supabase } from '@/lib/supabase';
import * as Linking from 'expo-linking';
import { Stack, useRouter } from 'expo-router';
import { useEffect } from 'react';

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
    const { path, queryParams } = Linking.parse(url);

    // Handle email confirmation for signup
    if (path === 'auth/confirm' && queryParams?.token_hash) {
      const { error } = await supabase.auth.verifyOtp({
        token_hash: queryParams.token_hash as string,
        type: 'email',
      });

      if (!error) {
        // Successfully confirmed - routing will be handled by root layout
        router.replace('/(tabs)');
      }
    }

    // Handle password recovery
    if (path === 'auth/confirm' && queryParams?.type === 'recovery') {
      router.push({
        pathname: '/reset-password',
        params: { token: queryParams.token as string },
      });
    }
  };

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name='index' options={{ headerShown: false }} />
    </Stack>
  );
}
