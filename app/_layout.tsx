import { supabase } from '@/lib/supabase';
import { Session } from '@supabase/supabase-js';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as Linking from 'expo-linking';
import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StatusBar, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 10,
      retry: 2,
    },
  },
});

export default function RootLayout() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const segments = useSegments();
  const router = useRouter();

  // Handle deep links BEFORE routing
  useEffect(() => {
    const handleDeepLink = async (url: string) => {
      console.log('🔗 Deep link received:', url);

      const { path, queryParams } = Linking.parse(url);
      console.log('📍 Path:', path);
      console.log('📋 Params:', queryParams);

      // Handle email confirmation
      if (
        path === 'auth/confirm' &&
        queryParams?.token_hash &&
        queryParams?.type === 'signup'
      ) {
        console.log('✉️ Verifying email...');

        try {
          const { error } = await supabase.auth.verifyOtp({
            token_hash: queryParams.token_hash as string,
            type: 'email',
          });

          if (error) {
            console.error('❌ Verification error:', error);
            router.replace('/(auth)');
            return;
          }

          console.log('✅ Email verified!');

          // Refresh session
          const { data } = await supabase.auth.getSession();
          setSession(data.session);

          // Immediately navigate away to prevent "Unmatched Route"
          setTimeout(() => {
            router.replace('/(tabs)');
          }, 100);
        } catch (err) {
          console.error('💥 Exception:', err);
          router.replace('/(auth)');
        }
      }
    };

    // Listen for deep links
    const subscription = Linking.addEventListener('url', ({ url }) => {
      handleDeepLink(url);
    });

    // Check initial URL
    Linking.getInitialURL().then((url) => {
      if (url) {
        console.log('🚀 Initial URL detected');
        handleDeepLink(url);
      }
    });

    return () => subscription.remove();
  }, []);

  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getSession();
      setSession(data.session);
      setLoading(false);
    };

    init();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log('🔐 Auth state changed:', _event);
      setSession(session);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (loading) {
      return;
    }

    const inAuthGroup = segments[0] === '(auth)';
    const inTabsGroup = segments[0] === '(tabs)';
    const inModalsGroup = segments[0] === '(modals)';
    const inOnboardingGroup = segments[0] === '(onboarding)';

    if (session && !inTabsGroup && !inModalsGroup && !inOnboardingGroup) {
      checkOnboardingStatus();
    } else if (!session && !inAuthGroup) {
      router.replace('/(auth)');
    }
  }, [session, segments, loading]);

  const checkOnboardingStatus = async () => {
    if (!session?.user?.id) return;

    const { data: profile } = await supabase
      .from('profiles')
      .select('onboarding_completed')
      .eq('id', session.user.id)
      .single();

    if (profile?.onboarding_completed === false) {
      router.replace('/(onboarding)');
    } else {
      router.replace('/(tabs)');
    }
  };

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: '#F5F9FF',
        }}
      >
        <ActivityIndicator size='large' color='#FFA500' />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <StatusBar backgroundColor='#FFFFFF' barStyle='dark-content' />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name='(auth)' options={{ headerShown: false }} />
          <Stack.Screen name='(onboarding)' options={{ headerShown: false }} />
          <Stack.Screen name='(tabs)' options={{ headerShown: false }} />
          <Stack.Screen name='(modals)' options={{ presentation: 'modal' }} />
        </Stack>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
