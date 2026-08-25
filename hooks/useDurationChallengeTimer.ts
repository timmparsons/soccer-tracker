import { useCallback, useEffect, useReducer, useRef } from 'react';
import { CountdownValue } from '@/hooks/useChallengeTimer';

export type DurationChallengeStatus = 'idle' | 'countdown' | 'active' | 'complete';

interface TimerState {
  status: DurationChallengeStatus;
  countdownValue: CountdownValue;
  remainingMs: number;
}

type TimerAction =
  | { type: 'START' }
  | { type: 'TICK_COUNTDOWN'; value: CountdownValue }
  | { type: 'GO' }
  | { type: 'TICK_REMAINING'; value: number }
  | { type: 'COMPLETE' }
  | { type: 'RESET' };

const COUNTDOWN_SEQUENCE: CountdownValue[] = [5, 4, 3, 2, 1, 'GO'];
const TICK_MS = 1000;
const REMAINING_SAMPLE_MS = 100;

interface UseDurationChallengeTimerArgs {
  durationSeconds: number;
  onCountdownTick?: (value: CountdownValue) => void;
  onGo?: () => void;
  onComplete?: () => void;
}

// Idle -> countdown (5..1,GO) -> active (counts DOWN from durationSeconds) ->
// complete (time's up — caller collects a self-reported rep count from here).
// Mirrors useChallengeTimer's shape but there's no result to compute: the
// "score" for duration-mode combos comes from the player, not the clock.
export function useDurationChallengeTimer({
  durationSeconds,
  onCountdownTick,
  onGo,
  onComplete,
}: UseDurationChallengeTimerArgs) {
  const durationMs = durationSeconds * 1000;
  const initialState: TimerState = { status: 'idle', countdownValue: 5, remainingMs: durationMs };

  const reducer = useCallback(
    (state: TimerState, action: TimerAction): TimerState => {
      switch (action.type) {
        case 'START':
          return { status: 'countdown', countdownValue: 5, remainingMs: durationMs };
        case 'TICK_COUNTDOWN':
          return { ...state, countdownValue: action.value };
        case 'GO':
          return { ...state, status: 'active', remainingMs: durationMs };
        case 'TICK_REMAINING':
          return { ...state, remainingMs: action.value };
        case 'COMPLETE':
          return { ...state, status: 'complete', remainingMs: 0 };
        case 'RESET':
          return { status: 'idle', countdownValue: 5, remainingMs: durationMs };
        default:
          return state;
      }
    },
    [durationMs],
  );

  const [state, dispatch] = useReducer(reducer, initialState);
  const endTimestampRef = useRef<number | null>(null);

  useEffect(() => {
    if (state.status !== 'countdown') return;

    const currentIndex = COUNTDOWN_SEQUENCE.indexOf(state.countdownValue);
    const timeout = setTimeout(() => {
      const next = COUNTDOWN_SEQUENCE[currentIndex + 1];
      if (next === undefined) return;

      onCountdownTick?.(next);

      if (next === 'GO') {
        endTimestampRef.current = Date.now() + durationMs;
        onGo?.();
        dispatch({ type: 'GO' });
      } else {
        dispatch({ type: 'TICK_COUNTDOWN', value: next });
      }
    }, TICK_MS);

    return () => clearTimeout(timeout);
  }, [state.status, state.countdownValue, onCountdownTick, onGo, durationMs]);

  useEffect(() => {
    if (state.status !== 'active') return;

    const interval = setInterval(() => {
      if (endTimestampRef.current == null) return;
      const remaining = Math.max(0, endTimestampRef.current - Date.now());
      dispatch({ type: 'TICK_REMAINING', value: remaining });
      if (remaining <= 0) {
        clearInterval(interval);
        onComplete?.();
        dispatch({ type: 'COMPLETE' });
      }
    }, REMAINING_SAMPLE_MS);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.status]);

  const start = useCallback(() => {
    endTimestampRef.current = null;
    onCountdownTick?.(5);
    dispatch({ type: 'START' });
  }, [onCountdownTick]);

  const retry = useCallback(() => start(), [start]);

  const reset = useCallback(() => {
    endTimestampRef.current = null;
    dispatch({ type: 'RESET' });
  }, []);

  return { ...state, start, retry, reset };
}
