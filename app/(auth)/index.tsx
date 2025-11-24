import Auth from '@/components/Auth';
import { supabase } from '@/lib/supabase';
import { Session } from '@supabase/supabase-js';
import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

export default function AuthScreen() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const insets = useSafeAreaInsets();

  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getSession();
      setSession(data.session);
      setLoading(false);
    };

    init();

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
      }
    );

    return () => listener.subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <SafeAreaView
        style={{
          flex: 1,
          justifyContent: 'center',
          paddingTop: insets.top,
          alignItems: 'center',
          backgroundColor: '#f9fafb',
        }}
      >
        <ActivityIndicator size='large' color='#3b82f6' />
      </SafeAreaView>
    );
  }

  if (session?.user) {
    return <Redirect href='/(tabs)' />;
  }

  return (
    <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 24 }}>
      <Auth />
    </View>
  );
}
