import { supabase } from '@/lib/supabase';
import { Session } from '@supabase/supabase-js';
import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

export default function RootLayout() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const segments = useSegments();
  const router = useRouter();

  console.log('=== RootLayout Render ===');
  console.log('Session:', session?.user?.email || 'none');
  console.log('Loading:', loading);
  console.log('Segments:', segments);

  useEffect(() => {
    const init = async () => {
      console.log('Initializing auth...');
      const { data } = await supabase.auth.getSession();
      console.log('Initial session:', data.session?.user?.email || 'none');
      setSession(data.session);
      setLoading(false);
    };

    init();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log('Auth state changed:', _event);
      console.log('New session:', session?.user?.email || 'none');
      setSession(session);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (loading) {
      console.log('Still loading, skipping navigation');
      return;
    }

    const inAuthGroup = segments[0] === '(auth)';
    const inTabsGroup = segments[0] === '(tabs)';

    console.log('Navigation check:');
    console.log('  - Has session:', !!session);
    console.log('  - In auth group:', inAuthGroup);
    console.log('  - In tabs group:', inTabsGroup);

    if (session && !inTabsGroup) {
      console.log('>>> Redirecting to /(tabs)');
      router.replace('/(tabs)');
    } else if (!session && !inAuthGroup) {
      console.log('>>> Redirecting to /(auth)');
      router.replace('/(auth)');
    }
  }, [session, segments, loading]);

  if (loading) {
    console.log('Showing loading screen');
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size='large' />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name='(auth)' options={{ headerShown: false }} />
      <Stack.Screen name='(tabs)' options={{ headerShown: false }} />
    </Stack>
  );
}
