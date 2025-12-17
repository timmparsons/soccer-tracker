import { router } from 'expo-router';
import { Text, TouchableOpacity, View } from 'react-native';

export default function VerifyEmail() {
  return (
    <View
      style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
      }}
    >
      <Text style={{ fontSize: 28, fontWeight: '700', marginBottom: 12 }}>
        Email Verified ✅
      </Text>

      <Text
        style={{
          fontSize: 16,
          textAlign: 'center',
          color: '#6b7280',
          marginBottom: 32,
        }}
      >
        Your email has been confirmed.
        {'\n'}
        Please sign in to continue.
      </Text>

      <TouchableOpacity
        onPress={() => router.replace('/(auth)')}
        style={{
          backgroundColor: '#3b82f6',
          paddingVertical: 14,
          paddingHorizontal: 24,
          borderRadius: 12,
        }}
      >
        <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>
          Go to Sign In
        </Text>
      </TouchableOpacity>
    </View>
  );
}
