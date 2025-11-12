import Auth from '@/components/Auth';
import { supabase } from '@/lib/supabase';
import { Session } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';

export default function AuthScreen() {
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
      }
    );

    return () => listener.subscription.unsubscribe();
  }, []);

  return (
    <View className='flex-1 items-center justify-center'>
      <Auth />
      {session && session.user && <Text>Welcome, {session.user.email}</Text>}
    </View>
  );
}
