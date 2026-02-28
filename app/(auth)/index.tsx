import Auth from '@/components/Auth';
import { View } from 'react-native';

// Auth routing is handled entirely by the root layout's route guard.
// Authenticated users are never routed here, so no session check is needed.
export default function AuthScreen() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 24 }}>
      <Auth />
    </View>
  );
}
