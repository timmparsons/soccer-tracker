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
  const [hasCheckedOnboarding, setHasCheckedOnboarding] = useState(false);
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
      !inMinigamesGroup &&
      !hasCheckedOnboarding
    ) {
      checkOnboardingStatus();
      return;
    }

    // Logged out but not in auth flow
    if (!session && !inAuthGroup) {
      setHasCheckedOnboarding(false); // Reset when logged out
      router.replace('/(auth)');
    }
  }, [session, segments, loading, hasCheckedOnboarding]);

  const checkOnboardingStatus = async () => {
    if (!session?.user?.id) return;

    setHasCheckedOnboarding(true);

    const { data: profile } = await supabase
      .from('profiles')
      .select('onboarding_completed, name, display_name')
      .eq('id', session.user.id)
      .single();

    // Sync name from user metadata if display_name looks like email prefix
    const metadata = session.user.user_metadata;
    const metaFirstName = metadata?.first_name;
    const metaLastName = metadata?.last_name;
    const emailPrefix = session.user.email?.split('@')[0];

    // If metadata has first_name and display_name is still the email prefix, update it
    if (metaFirstName && profile?.display_name === emailPrefix) {
      const fullName = [metaFirstName, metaLastName].filter(Boolean).join(' ').trim();
      await supabase
        .from('profiles')
        .update({
          name: fullName,
          display_name: metaFirstName,
        })
        .eq('id', session.user.id);

      // Invalidate the profile cache so the UI updates
      queryClient.invalidateQueries({ queryKey: ['profile', session.user.id] });
    }

    // If onboarding_completed is explicitly true, go to tabs
    // Otherwise (false, null, undefined, or no profile) go to onboarding
    if (profile?.onboarding_completed === true) {
      router.replace('/(tabs)');
    } else {
      router.replace('/(onboarding)');
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
