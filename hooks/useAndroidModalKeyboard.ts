import { useEffect, useState } from 'react';
import { Dimensions, Keyboard, LayoutChangeEvent, Platform } from 'react-native';

const screenHeight = Dimensions.get('window').height;

// Android RN Modal dialog windows resize for the keyboard inconsistently by
// device (some resize themselves, in which case any extra manual offset
// double-compensates and pushes sheet/dialog content off the top of the
// screen; others don't resize at all, leaving the keyboard covering the
// content). Measuring the dialog's actual height via onLayout and
// reconciling it against the keyboard's screenY at render time self-adapts
// to both, instead of guessing via KeyboardAvoidingView's 'height' behavior.
// See project memory: android-modal-keyboard.
export function useAndroidModalKeyboard() {
  const [dialogHeight, setDialogHeight] = useState(screenHeight);
  const [kbScreenY, setKbScreenY] = useState<number | null>(null);

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const show = Keyboard.addListener('keyboardDidShow', (e) => {
      setKbScreenY(e.endCoordinates.screenY);
    });
    const hide = Keyboard.addListener('keyboardDidHide', () => {
      setKbScreenY(null);
    });
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  const onDialogLayout = (ev: LayoutChangeEvent) => {
    setDialogHeight(ev.nativeEvent.layout.height);
  };

  const kbOverlap =
    Platform.OS === 'android' && kbScreenY != null
      ? Math.max(0, dialogHeight - kbScreenY)
      : 0;

  return { onDialogLayout, kbOverlap };
}
