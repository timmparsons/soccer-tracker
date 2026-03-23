// Web stub — Metro resolves to CameraTimerScreen.native.tsx on native devices.
import { View } from 'react-native';
import { Audio } from 'expo-av';

export interface CameraTimerScreenProps {
  duration: number;
  onComplete: (count: number) => void;
  onCancel: () => void;
  whistleSound: Audio.Sound | null;
}

export default function CameraTimerScreen(_props: CameraTimerScreenProps) {
  return <View />;
}
