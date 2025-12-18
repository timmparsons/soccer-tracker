import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    const handleAuth = async () => {
      const { data, error } = await supabase.auth.getSession();

      if (error) {
        console.error('Auth callback error:', error);
        router.replace('/(auth)/login');
        return;
      }

      if (data.session) {
        // ✅ user is authenticated
        router.replace('/(tabs)');
      } else {
        router.replace('/(auth)');
      }
    };

    handleAuth();
  }, []);

  return (
    <View style={{ flex: 1, justifyContent: 'center' }}>
      <ActivityIndicator size='large' />
    </View>
  );
}
