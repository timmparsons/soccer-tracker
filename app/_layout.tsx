import { supabase } from '@/lib/supabase';
import { Session } from '@supabase/supabase-js';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
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

  // 🔐 Load initial session + subscribe to auth changes
  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getSession();
      setSession(data.session);
      setLoading(false);
    };

    init();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => {
      sub.subscription.unsubscribe();
    };
  }, []);

  // 🧭 Route guarding
  useEffect(() => {
    if (loading) return;

    const rootSegment = segments[0];

    const inAuthGroup = rootSegment === '(auth)';
    const inTabsGroup = rootSegment === '(tabs)';
    const inModalsGroup = rootSegment === '(modals)';
    const inOnboardingGroup = rootSegment === '(onboarding)';
    const inMinigamesGroup = rootSegment === 'minigames';

    // Logged in but outside allowed areas
    if (
      session &&
      !inTabsGroup &&
      !inModalsGroup &&
      !inOnboardingGroup &&
      !inMinigamesGroup
    ) {
      checkOnboardingStatus();
      return;
    }

    // Logged out but not in auth flow
    if (!session && !inAuthGroup) {
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

  // ⏳ App boot loading state
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
        <StatusBar barStyle='dark-content' />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name='(auth)' />
          <Stack.Screen name='(onboarding)' />
          <Stack.Screen name='(tabs)' />
          <Stack.Screen name='minigames' />
        </Stack>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
