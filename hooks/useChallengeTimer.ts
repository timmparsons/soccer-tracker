import { useCallback, useEffect, useReducer, useRef } from 'react';

export type ChallengeStatus = 'idle' | 'countdown' | 'active' | 'complete';
export type CountdownValue = 10 | 9 | 8 | 7 | 6 | 5 | 4 | 3 | 2 | 1 | 'GO';

export interface ChallengeResult {
  durationMs: number;
  isPR: boolean;
  isCrown: boolean;
}

interface TimerState {
  status: ChallengeStatus;
  countdownValue: CountdownValue;
  elapsedMs: number;
  result: ChallengeResult | null;
}

type TimerAction =
  | { type: 'START' }
  | { type: 'TICK_COUNTDOWN'; value: CountdownValue }
  | { type: 'GO' }
  | { type: 'TICK_ELAPSED'; value: number }
  | { type: 'STOP'; result: ChallengeResult }
  | { type: 'RESET' };

const COUNTDOWN_SEQUENCE: CountdownValue[] = [10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 'GO'];
const TICK_MS = 1000;
const ELAPSED_SAMPLE_MS = 100;

const initialState: TimerState = {
  status: 'idle',
  countdownValue: 10,
  elapsedMs: 0,
  result: null,
};

function reducer(state: TimerState, action: TimerAction): TimerState {
  switch (action.type) {
    case 'START':
      return { ...initialState, status: 'countdown' };
    case 'TICK_COUNTDOWN':
      return { ...state, countdownValue: action.value };
    case 'GO':
      return { ...state, status: 'active', elapsedMs: 0 };
    case 'TICK_ELAPSED':
      return { ...state, elapsedMs: action.value };
    case 'STOP':
      return { ...state, status: 'complete', result: action.result };
    case 'RESET':
      return initialState;
    default:
      return state;
  }
}

interface UseChallengeTimerArgs {
  personalBestMs: number | null;
  crownThresholdMs: number;
  onCountdownTick?: (value: CountdownValue) => void;
  onGo?: () => void;
  onStop?: (result: ChallengeResult) => void;
}

// Idle -> countdown (10..1,GO) -> active (stopwatch running) -> complete (PR/Crown known).
// Retry re-enters at 'countdown'; Submit/Reset return to 'idle'. Persistence is the
// caller's job once it has a ChallengeResult — this hook has no opinion on it.
export function useChallengeTimer({
  personalBestMs,
  crownThresholdMs,
  onCountdownTick,
  onGo,
  onStop,
}: UseChallengeTimerArgs) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const goTimestampRef = useRef<number | null>(null);

  useEffect(() => {
    if (state.status !== 'countdown') return;

    const currentIndex = COUNTDOWN_SEQUENCE.indexOf(state.countdownValue);
    const timeout = setTimeout(() => {
      const next = COUNTDOWN_SEQUENCE[currentIndex + 1];
      if (next === undefined) return;

      onCountdownTick?.(next);

      if (next === 'GO') {
        goTimestampRef.current = Date.now();
        onGo?.();
        dispatch({ type: 'GO' });
      } else {
        dispatch({ type: 'TICK_COUNTDOWN', value: next });
      }
    }, TICK_MS);

    return () => clearTimeout(timeout);
  }, [state.status, state.countdownValue, onCountdownTick, onGo]);

  useEffect(() => {
    if (state.status !== 'active') return;

    const interval = setInterval(() => {
      if (goTimestampRef.current == null) return;
      dispatch({ type: 'TICK_ELAPSED', value: Date.now() - goTimestampRef.current });
    }, ELAPSED_SAMPLE_MS);

    return () => clearInterval(interval);
  }, [state.status]);

  const start = useCallback(() => {
    goTimestampRef.current = null;
    onCountdownTick?.(10);
    dispatch({ type: 'START' });
  }, [onCountdownTick]);

  const stop = useCallback(() => {
    if (state.status !== 'active' || goTimestampRef.current == null) return;

    const durationMs = Date.now() - goTimestampRef.current;
    const result: ChallengeResult = {
      durationMs,
      isPR: personalBestMs == null || durationMs < personalBestMs,
      isCrown: durationMs <= crownThresholdMs,
    };

    onStop?.(result);
    dispatch({ type: 'STOP', result });
  }, [state.status, personalBestMs, crownThresholdMs, onStop]);

  const retry = useCallback(() => start(), [start]);

  const reset = useCallback(() => {
    goTimestampRef.current = null;
    dispatch({ type: 'RESET' });
  }, []);

  return { ...state, start, stop, retry, reset };
}
