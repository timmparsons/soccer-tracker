import * as Notifications from 'expo-notifications';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, Vibration } from 'react-native';

export interface IntervalPhase {
  label: string;
  seconds: number;
  cueSound: 'work' | 'rest' | 'complete' | 'go';
}

interface UseIntervalTimerOptions {
  onPhaseChange?: (phase: IntervalPhase, index: number) => void;
  onComplete?: () => void;
}

// Repeating-phase timer engine for Tabata/Circuit runners. Background-safe:
// each phase tracks an absolute Date.now()-based end time (survives phone
// sleep) with an expo-notifications fallback rescheduled at every phase
// boundary, mirroring the free-practice timer pattern in TrainPage/index.tsx.
export function useIntervalTimer(
  phases: IntervalPhase[],
  { onPhaseChange, onComplete }: UseIntervalTimerOptions = {},
) {
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [secondsRemaining, setSecondsRemaining] = useState(phases[0]?.seconds ?? 0);
  const [isRunning, setIsRunning] = useState(false);

  const phasesRef = useRef(phases);
  phasesRef.current = phases;
  const phaseIndexRef = useRef(0);
  const startedRef = useRef(false);
  const onPhaseChangeRef = useRef(onPhaseChange);
  onPhaseChangeRef.current = onPhaseChange;
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const endTimeRef = useRef(0);
  const pausedRemainingRef = useRef(phases[0]?.seconds ?? 0);
  const notificationIdRef = useRef<string | null>(null);

  const clearScheduled = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (notificationIdRef.current) {
      Notifications.cancelScheduledNotificationAsync(
        notificationIdRef.current,
      ).catch(() => {});
      notificationIdRef.current = null;
    }
  }, []);

  const scheduleFallbackNotification = useCallback(
    (endTime: number, phase: IntervalPhase) => {
      Notifications.scheduleNotificationAsync({
        content: {
          title: phase.cueSound === 'complete' ? 'Session complete!' : `${phase.label} done`,
          body: 'Tap to return to your session.',
          ...(Platform.OS === 'android' && { channelId: 'timer' }),
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: new Date(endTime),
        },
      })
        .then((id) => {
          notificationIdRef.current = id;
        })
        .catch(() => {});
    },
    [],
  );

  const beginPhaseTick = useCallback(() => {
    const remaining = pausedRemainingRef.current;
    endTimeRef.current = Date.now() + remaining * 1000;
    scheduleFallbackNotification(endTimeRef.current, phasesRef.current[phaseIndexRef.current]);

    intervalRef.current = setInterval(() => {
      const secondsLeft = Math.round((endTimeRef.current - Date.now()) / 1000);
      if (secondsLeft <= 0) {
        clearScheduled();
        const nextIndex = phaseIndexRef.current + 1;
        if (nextIndex >= phasesRef.current.length) {
          setIsRunning(false);
          setSecondsRemaining(0);
          Vibration.vibrate([0, 500, 200, 500]);
          onCompleteRef.current?.();
          return;
        }
        const nextPhase = phasesRef.current[nextIndex];
        phaseIndexRef.current = nextIndex;
        setPhaseIndex(nextIndex);
        pausedRemainingRef.current = nextPhase.seconds;
        setSecondsRemaining(nextPhase.seconds);
        Vibration.vibrate(150);
        onPhaseChangeRef.current?.(nextPhase, nextIndex);
        beginPhaseTick();
      } else {
        pausedRemainingRef.current = secondsLeft;
        setSecondsRemaining(secondsLeft);
      }
    }, 250);
  }, [clearScheduled, scheduleFallbackNotification]);

  const start = useCallback(() => {
    if (isRunning || phasesRef.current.length === 0) return;
    if (!startedRef.current) {
      startedRef.current = true;
      onPhaseChangeRef.current?.(phasesRef.current[0], 0);
    }
    setIsRunning(true);
    beginPhaseTick();
  }, [isRunning, beginPhaseTick]);

  const pause = useCallback(() => {
    clearScheduled();
    setIsRunning(false);
  }, [clearScheduled]);

  const reset = useCallback(() => {
    clearScheduled();
    setIsRunning(false);
    startedRef.current = false;
    phaseIndexRef.current = 0;
    setPhaseIndex(0);
    const firstSeconds = phasesRef.current[0]?.seconds ?? 0;
    pausedRemainingRef.current = firstSeconds;
    setSecondsRemaining(firstSeconds);
  }, [clearScheduled]);

  useEffect(() => clearScheduled, [clearScheduled]);

  return {
    currentPhase: phasesRef.current[phaseIndex] ?? null,
    phaseIndex,
    secondsRemaining,
    isRunning,
    start,
    pause,
    reset,
  };
}
