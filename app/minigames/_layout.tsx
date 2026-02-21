// app/minigames/_layout.tsx
import { Stack } from 'expo-router';

export default function MinigamesLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name='cone-dribble' />
    </Stack>
  );
}
