import SplashScreen from '@/components/SplashScreen';
import {
  requestNotificationPermission,
  scheduleInactivityReminders,
} from '@/lib/notifications';
import { supabase } from '@/lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Session } from '@supabase/supabase-js';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as Linking from 'expo-linking';
import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { StatusBar } from 'react-native';
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
  const [minTimeDone, setMinTimeDone] = useState(false);
  const [targetRoute, setTargetRoute] = useState<string>('/(auth)');
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);
  const [hasSeenIntro, setHasSeenIntro] = useState(false);
  const recoveryRef = useRef(false);
  const navigatingRef = useRef(false);

  const segments = useSegments();
  const router = useRouter();

  // Minimum splash display time — 1.5 s so the logo is visible
  useEffect(() => {
    const t = setTimeout(() => setMinTimeDone(true), 1500);
    return () => clearTimeout(t);
  }, []);

  // 🔐 Load session, fetch profile, determine target route
  useEffect(() => {
    const handleRecoveryUrl = async (url: string) => {
      if (!url.includes('reset-password') && !url.includes('type=recovery'))
        return;

      recoveryRef.current = true;
      setIsPasswordRecovery(true);

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

      const fragment = url.split('#')[1] ?? '';
      const hashParams = new URLSearchParams(fragment);
      const accessToken = hashParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token');
      if (accessToken && refreshToken) {
        try {
          await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
        } catch (e) {
          console.error('Error setting recovery session:', e);
        }
      }
    };

    const init = async () => {
      try {
        const initialUrl = await Linking.getInitialURL();
        if (initialUrl) await handleRecoveryUrl(initialUrl);

        const [sessionResult, seen] = await Promise.all([
          supabase.auth.getSession(),
          AsyncStorage.getItem('hasSeenIntro'),
        ]);

        if (sessionResult.error) {
          await supabase.auth.signOut();
        }

        const sess = sessionResult.error ? null : sessionResult.data.session;
        const seenIntro = seen === 'true';

        setSession(sess);
        setHasSeenIntro(seenIntro);

        if (!sess) {
          setTargetRoute(seenIntro ? '/(auth)' : '/(auth)/intro');
          return;
        }

        // Fetch profile to determine whether onboarding is done
        try {
          const timeout = new Promise<{ data: null }>((resolve) =>
            setTimeout(() => resolve({ data: null }), 5000),
          );
          const query = supabase
            .from('profiles')
            .select('onboarding_completed, name, display_name')
            .eq('id', sess.user.id)
            .single();
          const { data: profile } = await Promise.race([query, timeout]);

          // Sync name from user metadata if display_name looks like email prefix
          if (profile) {
            const metadata = sess.user.user_metadata;
            const metaFirstName = metadata?.first_name;
            const metaLastName = metadata?.last_name;
            const emailPrefix = sess.user.email?.split('@')[0];

            if (metaFirstName && (!profile.display_name || profile.display_name === emailPrefix)) {
              const fullName = [metaFirstName, metaLastName]
                .filter(Boolean)
                .join(' ')
                .trim();
              await supabase
                .from('profiles')
                .update({ name: fullName, display_name: metaFirstName })
                .eq('id', sess.user.id);
              queryClient.invalidateQueries({
                queryKey: ['profile', sess.user.id],
              });
            }
          }

          setTargetRoute(
            profile?.onboarding_completed === true
              ? '/(tabs)'
              : '/(onboarding)',
          );
          setupNotifications(sess.user.id);
        } catch {
          setTargetRoute('/(tabs)');
        }
      } catch (e) {
        console.error('Init error:', e);
        setTargetRoute('/(auth)');
      } finally {
        setLoading(false);
      }
    };

    init();

    const urlSub = Linking.addEventListener('url', ({ url }) =>
      handleRecoveryUrl(url),
    );

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        recoveryRef.current = true;
        setIsPasswordRecovery(true);
        setSession(session);
        return;
      }

      if (event === 'USER_UPDATED') {
        recoveryRef.current = false;
        setIsPasswordRecovery(false);
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

  // Navigate to the computed target route once both loading and the minimum
  // splash time have finished. The Stack is only mounted at this point so
  // there is no auth screen rendered underneath while we wait.
  useEffect(() => {
    if (!loading && minTimeDone) {
      router.replace(targetRoute as any);
    }
  }, [loading, minTimeDone]);

  // Called by the route guard when a user signs in at runtime
  const handleSignIn = async (sess: Session) => {
    try {
      const timeout = new Promise<{ data: null }>((resolve) =>
        setTimeout(() => resolve({ data: null }), 5000),
      );
      const query = supabase
        .from('profiles')
        .select('onboarding_completed, display_name, name')
        .eq('id', sess.user.id)
        .single();
      const { data: profile } = await Promise.race([query, timeout]);

      // Sync name from auth metadata if the profile still has the email prefix
      // (happens on first sign-in after email confirmation)
      if (profile) {
        const metadata = sess.user.user_metadata;
        const metaFirstName = metadata?.first_name;
        const metaLastName = metadata?.last_name;
        const emailPrefix = sess.user.email?.split('@')[0];

        if (metaFirstName && (!profile.display_name || profile.display_name === emailPrefix)) {
          const fullName = [metaFirstName, metaLastName]
            .filter(Boolean)
            .join(' ')
            .trim();
          await supabase
            .from('profiles')
            .update({ name: fullName, display_name: metaFirstName })
            .eq('id', sess.user.id);
          queryClient.invalidateQueries({ queryKey: ['profile', sess.user.id] });
        }
      }

      router.replace(
        profile?.onboarding_completed === true ? '/(tabs)' : '/(onboarding)',
      );
      setupNotifications(sess.user.id);
    } catch {
      router.replace('/(tabs)');
    } finally {
      navigatingRef.current = false;
    }
  };

  // 🧭 Runtime route guard — handles sign-in, sign-out, and auth changes after startup
  useEffect(() => {
    if (loading || !minTimeDone) return;

    const rootSegment = segments[0];
    const inAuthGroup = rootSegment === '(auth)';

    if (isPasswordRecovery) {
      if (rootSegment !== '(auth)') {
        router.replace('/(auth)/reset-password');
      }
      return;
    }

    // User just signed in — navigate away from auth screens
    if (session && inAuthGroup && !navigatingRef.current) {
      navigatingRef.current = true;
      handleSignIn(session);
      return;
    }

    // User signed out — send back to auth
    if (!session && !inAuthGroup) {
      router.replace(hasSeenIntro ? '/(auth)' : '/(auth)/intro');
    }
  }, [session, segments, loading, minTimeDone, isPasswordRecovery, hasSeenIntro]);

  // Fire-and-forget: request notification permission and schedule reminders.
  const setupNotifications = async (userId: string) => {
    const granted = await requestNotificationPermission();
    if (!granted) return;

    const { data: lastSession } = await supabase
      .from('daily_sessions')
      .select('date')
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .limit(1)
      .single();

    if (lastSession?.date) {
      const [year, month, day] = lastSession.date.split('-').map(Number);
      await scheduleInactivityReminders(new Date(year, month - 1, day));
    }
  };

  // While loading or splash minimum time hasn't elapsed: show the splash
  // screen directly — the Stack is NOT mounted, so no auth screen can flash.
  if (loading || !minTimeDone) {
    return (
      <SafeAreaProvider>
        <StatusBar barStyle='dark-content' />
        <SplashScreen />
      </SafeAreaProvider>
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
