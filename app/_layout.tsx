import { useAuth } from '@/hooks/useAuth';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack, router, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';

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
  const { user, loading, isConfirmed } = useAuth();
  const segments = useSegments();

  useEffect(() => {
    if (loading) return;

    const root = segments[0]; // '(auth)', '(tabs)', 'verify-email', etc.

    // 1️⃣ Not signed in → auth
    if (!user && root !== '(auth)') {
      router.replace('/(auth)');
      return;
    }

    // 2️⃣ Signed in but NOT confirmed → verify-email
    if (user && !isConfirmed && root !== 'verify-email') {
      router.replace('/verify-email');
      return;
    }

    // 3️⃣ Signed in AND confirmed → tabs
    if (user && isConfirmed && root !== '(tabs)') {
      router.replace('/(tabs)');
    }
  }, [user, isConfirmed, loading, segments]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size='large' />
      </View>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name='(auth)' />
        <Stack.Screen name='verify-email' />
        <Stack.Screen name='(tabs)' />
        <Stack.Screen name='(modals)' options={{ presentation: 'modal' }} />
      </Stack>
    </QueryClientProvider>
  );
}
