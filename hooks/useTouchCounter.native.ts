import { useCallback, useState } from 'react';

// VisionCamera and worklets-core require a native build (expo prebuild + pod install).
// Wrapping in try/catch prevents a crash in Expo Go where the native module isn't linked.
let _useFrameProcessor: typeof import('react-native-vision-camera').useFrameProcessor | null = null;
let _useSharedValue: typeof import('react-native-worklets-core').useSharedValue | null = null;
let _runOnJS: typeof import('react-native-worklets-core').runOnJS | null = null;
let nativeModulesAvailable = false;

try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  _useFrameProcessor = require('react-native-vision-camera').useFrameProcessor;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const wc = require('react-native-worklets-core');
  _useSharedValue = wc.useSharedValue;
  _runOnJS = wc.runOnJS;
  nativeModulesAvailable = true;
} catch {
  // Native modules not linked — camera mode will be non-functional until a dev/prod build is run
}

// Sampling — every Nth pixel to keep the worklet fast enough for 30fps
const SAMPLE_STRIDE = 10;
const BRIGHTNESS_THRESHOLD = 185;
const MIN_BRIGHT_PIXELS = 6;
const MAX_BRIGHT_PIXELS = 600;
const VELOCITY_DIP = 4;
const VELOCITY_SPIKE = 14;
const FRAMES_DEBOUNCE = 6;

function useTouchCounterStub() {
  return {
    touchCount: 0,
    ballDetected: false,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    frameProcessor: undefined as any,
    reset: () => {},
  };
}

function useTouchCounterNative() {
  // Non-null assertions safe here: this function only runs when nativeModulesAvailable === true
  const useSharedValue = _useSharedValue!;
  const useFrameProcessor = _useFrameProcessor!;
  const runOnJS = _runOnJS!;

  const [touchCount, setTouchCount] = useState(0);
  const [ballDetected, setBallDetected] = useState(false);

  const prevX = useSharedValue(-1);
  const prevY = useSharedValue(-1);
  const wasSlow = useSharedValue(false);
  const internalCount = useSharedValue(0);
  const framesSince = useSharedValue(FRAMES_DEBOUNCE);

  const onCountChange = useCallback((c: number) => setTouchCount(c), []);
  const onBallChange = useCallback((d: boolean) => setBallDetected(d), []);

  const frameProcessor = useFrameProcessor(
    (frame) => {
      'worklet';

      const w = frame.width;
      const h = frame.height;
      const rowStride = frame.bytesPerRow;
      const yStart = Math.floor(h * 0.15);
      const yEnd = Math.floor(h * 0.85);

      // YUV (NV12): Y-plane luminance at (col, row) = pix[row * rowStride + col]
      const buf = frame.toArrayBuffer();
      const pix = new Uint8Array(buf);

      let bx = 0;
      let by = 0;
      let bc = 0;

      for (let row = yStart; row < yEnd; row += SAMPLE_STRIDE) {
        for (let col = 0; col < w; col += SAMPLE_STRIDE) {
          if (pix[row * rowStride + col] > BRIGHTNESS_THRESHOLD) {
            bx += col;
            by += row;
            bc++;
          }
        }
      }

      const found = bc >= MIN_BRIGHT_PIXELS && bc <= MAX_BRIGHT_PIXELS;
      runOnJS(onBallChange)(found);

      framesSince.value++;

      if (!found) {
        prevX.value = -1;
        prevY.value = -1;
        wasSlow.value = false;
        return;
      }

      const cx = bx / bc;
      const cy = by / bc;

      if (prevX.value >= 0) {
        const dx = cx - prevX.value;
        const dy = cy - prevY.value;
        const speed = Math.sqrt(dx * dx + dy * dy);

        if (
          wasSlow.value &&
          speed > VELOCITY_SPIKE &&
          framesSince.value >= FRAMES_DEBOUNCE
        ) {
          internalCount.value++;
          framesSince.value = 0;
          runOnJS(onCountChange)(internalCount.value);
        }

        wasSlow.value = speed < VELOCITY_DIP;
      }

      prevX.value = cx;
      prevY.value = cy;
    },
    [onBallChange, onCountChange],
  );

  const reset = useCallback(() => {
    setTouchCount(0);
    setBallDetected(false);
    internalCount.value = 0;
    prevX.value = -1;
    prevY.value = -1;
    wasSlow.value = false;
    framesSince.value = FRAMES_DEBOUNCE;
  }, []);

  return { touchCount, ballDetected, frameProcessor, reset };
}

// Decision made once at module-load time — never changes during the app's lifetime,
// so React's rules of hooks are not violated.
export const useTouchCounter = nativeModulesAvailable
  ? useTouchCounterNative
  : useTouchCounterStub;
