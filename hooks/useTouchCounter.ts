// Web stub — VisionCamera is not available on web.
// Metro resolves to useTouchCounter.native.ts on native devices.
export function useTouchCounter() {
  return {
    touchCount: 0,
    ballDetected: false,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    frameProcessor: undefined as any,
    reset: () => {},
  };
}
