import { useEffect } from 'react';
import { Platform } from 'react-native';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';

// Keeps the screen on only while `active` is true, so a timer screen left
// mounted-but-hidden (e.g. a modal toggling `visible`) doesn't block sleep forever.
export function useKeepAwakeWhen(active: boolean, tag: string): void {
  useEffect(() => {
    if (Platform.OS === 'web' || !active) return;
    activateKeepAwakeAsync(tag);
    return () => {
      deactivateKeepAwake(tag);
    };
  }, [active, tag]);
}
