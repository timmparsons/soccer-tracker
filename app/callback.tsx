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
        // Sync user metadata to profile if needed
        const user = data.session.user;
        const metadata = user.user_metadata;
        const firstName = metadata?.first_name;
        const lastName = metadata?.last_name;

        if (firstName) {
          const emailPrefix = user.email?.split('@')[0];

          // Check if profile display_name is still the email prefix
          const { data: profile } = await supabase
            .from('profiles')
            .select('display_name')
            .eq('id', user.id)
            .single();

          // Only update if display_name is the email prefix
          if (profile?.display_name === emailPrefix) {
            const fullName = [firstName, lastName].filter(Boolean).join(' ').trim();
            await supabase
              .from('profiles')
              .update({
                name: fullName,
                display_name: firstName,
              })
              .eq('id', user.id);

            console.log('✅ Profile synced with display_name:', firstName);
          }
        }

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
