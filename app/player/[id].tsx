import PlayerProfile from '@/components/PlayerProfile';
import { useLocalSearchParams } from 'expo-router';

export default function PlayerProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <PlayerProfile playerId={id} />;
}
