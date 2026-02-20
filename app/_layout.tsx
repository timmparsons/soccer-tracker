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
  const [hasCheckedOnboarding, setHasCheckedOnboarding] = useState(false);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);
  const segments = useSegments();
  const router = useRouter();

  // 🔐 Load initial session + subscribe to auth changes
  useEffect(() => {
    const handleRecoveryUrl = async (url: string) => {
      if (!url.includes('reset-password') && !url.includes('type=recovery')) return;

      setIsPasswordRecovery(true);

      // PKCE flow: exchange the code for a session (triggers PASSWORD_RECOVERY event)
      const queryPart = url.split('?')[1]?.split('#')[0] ?? '';
      const params = new URLSearchParams(queryPart);
      const code = params.get('code');
      if (code) {
        try {
          await supabase.auth.exchangeCodeForSession(code);
        } catch (e) {
          console.error('Error exchanging recovery code:', e);
        }
        return;
      }

      // Implicit flow fallback: extract tokens from URL hash
      const fragment = url.split('#')[1] ?? '';
      const hashParams = new URLSearchParams(fragment);
      const accessToken = hashParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token');
      if (accessToken && refreshToken) {
        try {
          await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
        } catch (e) {
          console.error('Error setting recovery session:', e);
        }
      }
    };

    const init = async () => {
      const initialUrl = await Linking.getInitialURL();
      if (initialUrl) {
        await handleRecoveryUrl(initialUrl);
      }

      const { data } = await supabase.auth.getSession();
      setSession(data.session);
      setLoading(false);
    };

    init();

    // Handle deep link when app is already open
    const urlSub = Linking.addEventListener('url', ({ url }) => handleRecoveryUrl(url));

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsPasswordRecovery(true);
        setSession(session);
        router.replace('/(auth)/reset-password');
        return;
      }

      if (event === 'USER_UPDATED') {
        // Password was successfully reset — clear recovery mode so route guard
        // can route the user to tabs/onboarding normally
        setIsPasswordRecovery(false);
        setHasCheckedOnboarding(false);
        setSession(session);
        return;
      }

      setSession(session);
    });

    return () => {
      sub.subscription.unsubscribe();
      urlSub.remove();
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

    // Logged in but outside allowed areas (skip if in password recovery)
    if (
      session &&
      !inTabsGroup &&
      !inModalsGroup &&
      !inOnboardingGroup &&
      !inMinigamesGroup &&
      !hasCheckedOnboarding &&
      !isPasswordRecovery
    ) {
      checkOnboardingStatus();
      return;
    }

    // Logged out but not in auth flow (skip if in password recovery)
    if (!session && !inAuthGroup && !isPasswordRecovery) {
      setHasCheckedOnboarding(false); // Reset when logged out
      router.replace('/(auth)');
    }
  }, [session, segments, loading, hasCheckedOnboarding, isPasswordRecovery]);

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
