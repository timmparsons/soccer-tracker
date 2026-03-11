import { useTouchCounter } from '@/hooks/useTouchCounter';
import { Audio } from 'expo-av';
import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Vibration,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { CameraTimerScreenProps } from './CameraTimerScreen';

// VisionCamera is only available in native builds (not Expo Go).
// Stubs keep the component from crashing on import when the native module isn't linked.
let CameraComponent: React.ComponentType<any> = View;
let useCameraDeviceFn: (pos: 'back' | 'front') => any = () => undefined;
let useCameraPermissionFn: () => { hasPermission: boolean; requestPermission: () => Promise<boolean> } =
  () => ({ hasPermission: false, requestPermission: async () => false });
let visionCameraAvailable = false;

try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const vc = require('react-native-vision-camera');
  CameraComponent = vc.Camera;
  useCameraDeviceFn = vc.useCameraDevice;
  useCameraPermissionFn = vc.useCameraPermission;
  visionCameraAvailable = true;
} catch {
  // Native module not linked — show "needs native build" fallback
}

export type { CameraTimerScreenProps };

export default function CameraTimerScreen({
  duration,
  onComplete,
  onCancel,
  whistleSound,
}: CameraTimerScreenProps) {
  const { hasPermission, requestPermission } = useCameraPermissionFn();
  const [facing, setFacing] = useState<'back' | 'front'>('back');
  const device = useCameraDeviceFn(facing);

  const [timeRemaining, setTimeRemaining] = useState(duration);
  const [timerRunning, setTimerRunning] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { touchCount, ballDetected, frameProcessor, reset } = useTouchCounter();
  const touchCountRef = useRef(0);
  useEffect(() => {
    touchCountRef.current = touchCount;
  }, [touchCount]);

  // Request permission on mount if needed
  useEffect(() => {
    if (visionCameraAvailable && !hasPermission) {
      requestPermission().then((granted) => {
        if (!granted) {
          Alert.alert(
            'Camera Permission Required',
            'Enable camera access in Settings to use AI touch counting.',
            [{ text: 'OK', onPress: onCancel }],
          );
        }
      });
    }
  }, []);

  useEffect(() => {
    if (!timerRunning) return;

    timerRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          timerRef.current = null;
          setTimerRunning(false);
          Vibration.vibrate([0, 500, 200, 500]);
          whistleSound?.replayAsync();
          onComplete(touchCountRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timerRunning]);

  const handleStop = () => {
    Alert.alert('Stop Timer?', 'Are you sure you want to stop?', [
      { text: 'Keep Going', style: 'cancel' },
      {
        text: 'Stop',
        style: 'destructive',
        onPress: () => {
          if (timerRef.current) clearInterval(timerRef.current);
          onCancel();
        },
      },
    ]);
  };

  const handleReset = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setTimerRunning(false);
    setTimeRemaining(duration);
    reset();
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    return `${m}:${(s % 60).toString().padStart(2, '0')}`;
  };

  // Fallback for Expo Go / camera unavailable
  if (!visionCameraAvailable || !hasPermission || !device) {
    return (
      <View style={styles.noCamera}>
        <Text style={styles.noCameraEmoji}>📷</Text>
        <Text style={styles.noCameraTitle}>Native build required</Text>
        <Text style={styles.noCameraText}>
          {!visionCameraAvailable
            ? 'Camera AI requires a dev or production build.\nRun: npx expo run:ios'
            : !hasPermission
              ? 'Camera permission is required for AI counting.'
              : 'No camera device found.'}
        </Text>
        <TouchableOpacity style={styles.backButton} onPress={onCancel}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraComponent
        style={styles.camera}
        device={device}
        isActive={true}
        frameProcessor={frameProcessor}
        pixelFormat='yuv'
      />

      <SafeAreaView style={styles.overlay} edges={['top', 'bottom']}>
        {/* Timer — top */}
        <View style={styles.topBar}>
          <View style={styles.timerBadge}>
            <Text style={styles.timerText}>{formatTime(timeRemaining)}</Text>
            <Text style={styles.timerLabel}>{timerRunning ? 'remaining' : 'paused'}</Text>
          </View>
        </View>

        {/* Touch count — centre */}
        <View style={styles.centreContent}>
          <Text style={styles.countNumber}>{touchCount}</Text>
          <Text style={styles.countLabel}>touches</Text>
          <View style={styles.ballStatus}>
            <View
              style={[
                styles.ballDot,
                { backgroundColor: ballDetected ? '#31af4d' : '#78909C' },
              ]}
            />
            <Text style={styles.ballStatusText}>
              {ballDetected ? 'Ball detected' : 'No ball detected'}
            </Text>
          </View>
        </View>

        {/* Controls — bottom */}
        <View style={styles.controls}>
          <TouchableOpacity style={styles.controlButton} onPress={handleReset}>
            <Text style={styles.controlIcon}>↺</Text>
            <Text style={styles.controlText}>Reset</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.playButton}
            onPress={() => setTimerRunning((p) => !p)}
          >
            <Text style={styles.playIcon}>{timerRunning ? '⏸' : '▶'}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.controlButton}
            onPress={() => setFacing((f) => (f === 'back' ? 'front' : 'back'))}
          >
            <Text style={styles.controlIcon}>⇄</Text>
            <Text style={styles.controlText}>Flip</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.controlButton} onPress={handleStop}>
            <Text style={styles.controlIcon}>✕</Text>
            <Text style={styles.controlText}>Stop</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    ...StyleSheet.absoluteFillObject,
  },
  overlay: {
    flex: 1,
    justifyContent: 'space-between',
  },

  // TOP
  topBar: {
    paddingHorizontal: 20,
    paddingTop: 8,
    alignItems: 'flex-start',
  },
  timerBadge: {
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 10,
    alignItems: 'center',
  },
  timerText: {
    fontSize: 40,
    fontWeight: '900',
    color: '#FFF',
    lineHeight: 44,
  },
  timerLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
  },

  // CENTRE
  centreContent: {
    alignItems: 'center',
  },
  countNumber: {
    fontSize: 96,
    fontWeight: '900',
    color: '#FFF',
    lineHeight: 100,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  countLabel: {
    fontSize: 22,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.85)',
    marginTop: 4,
    marginBottom: 16,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  ballStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
  },
  ballDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  ballStatusText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFF',
  },

  // CONTROLS
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 20,
    paddingBottom: 16,
    paddingHorizontal: 24,
  },
  controlButton: {
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 14,
    minWidth: 64,
  },
  controlIcon: {
    fontSize: 20,
    color: '#FFF',
  },
  controlText: {
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.85)',
  },
  playButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  playIcon: {
    fontSize: 28,
  },

  // FALLBACK (Expo Go / no native module)
  noCamera: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    padding: 32,
  },
  noCameraEmoji: {
    fontSize: 64,
  },
  noCameraTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFF',
    textAlign: 'center',
  },
  noCameraText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#78909C',
    textAlign: 'center',
    lineHeight: 22,
  },
  backButton: {
    backgroundColor: '#1f89ee',
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 8,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFF',
  },
});
