import { supabase } from '@/lib/supabase';
import { useState } from 'react';
import { Alert, Button, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function Auth() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const signIn = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      console.log('✅ Signed in:', data);
      Alert.alert('Success', 'Signed in!');
    } catch (err: any) {
      console.error('❌ Sign-in error:', err.message);
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  const signUp = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) throw error;
      console.log('✅ Signed up:', data);
      Alert.alert('Success', 'Check your email for confirmation link!');
    } catch (err: any) {
      console.error('❌ Sign-up error:', err.message);
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className='w-3/4 gap-2'>
      <TextInput
        placeholder='Email'
        autoCapitalize='none'
        value={email}
        onChangeText={setEmail}
        style={{ borderWidth: 1, padding: 8, marginBottom: 8 }}
      />
      <TextInput
        placeholder='Password'
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        style={{ borderWidth: 1, padding: 8, marginBottom: 8 }}
      />
      <Button title={loading ? 'Signing in...' : 'Sign In'} onPress={signIn} />
      <Button title='Sign Up' onPress={signUp} />
    </SafeAreaView>
  );
}
