# Plan: AI Real-Time Touch Counter

## Context
Currently, when a timer session ends, the user manually types their touch count into a score entry modal. This plan adds a **Pro-gated camera mode** that uses real-time computer vision to automatically count ball touches during the session — the camera watches the ball, detects touches, and pre-fills the score modal when the timer ends. User can always adjust the number before saving.

---

## Architecture Overview

```
User taps START TIMER
  → (Pro) Camera timer screen appears
      - Full-screen camera preview
      - Timer countdown overlay (top)
      - Live touch counter (centre)
      - Pause/Stop controls (bottom)
  → Frame processor runs on each frame
      - Detect ball (circle detection)
      - Track ball position across frames
      - Velocity direction change = touch event
      - Increment live counter
  → Timer ends → whistle + vibration
  → Score modal opens, pre-filled with AI count
  → User confirms or adjusts → saves to Supabase
```

Free users get the existing manual entry flow. Pro users get the camera mode (with manual fallback if they prefer).

---

## Packages to Install

```bash
npx expo install react-native-vision-camera
npx expo install react-native-worklets-core
```

`react-native-reanimated` is already installed.

`react-native-vision-camera` v4 supports Frame Processors via worklets, which run JS on every camera frame with near-native performance. No separate ML model needed for MVP — we use Apple's built-in Vision framework circle/contour detection via a VisionCamera plugin, or a pure-JS motion tracking approach as a first pass.

---

## Files Changed

| File | Action |
|------|--------|
| `app.json` | Add `react-native-vision-camera` camera permission strings |
| `app/_layout.tsx` | Add camera permission request |
| `components/TrainPage/index.tsx` | Add camera mode toggle; replace timer modal with CameraTimerScreen when Pro + camera enabled |
| `components/TrainPage/CameraTimerScreen.tsx` | **Create** — full-screen camera + timer + live counter |
| `hooks/useTouchCounter.ts` | **Create** — frame processor logic: ball tracking + touch detection |

---

## Implementation Plan

### 1. `app.json` — Camera permissions
```json
"ios": {
  "infoPlist": {
    "NSCameraUsageDescription": "MasterTouch uses the camera to automatically count your ball touches during practice."
  }
}
```

### 2. `hooks/useTouchCounter.ts` — Frame processor
- Runs as a VisionCamera frame processor worklet
- **Ball detection**: Track the largest moving circular region between frames (colour blob + contour detection)
- **Touch detection algorithm — works for both juggling AND ground touches**:
  1. Maintain a rolling window of the ball's centroid positions (last 6 frames)
  2. Calculate velocity vector each frame: `vel[n] = pos[n] - pos[n-1]`
  3. Calculate velocity magnitude: `speed = sqrt(vx² + vy²)`
  4. Detect a touch when **velocity magnitude drops below a minimum threshold then spikes above it again** — this captures the deceleration-on-contact + acceleration-after-contact pattern that occurs for ALL touch types:
     - Juggling: ball decelerates at apex, foot contact, ball accelerates upward
     - Ground toe-taps: ball briefly stationary (speed ≈ 0), foot taps, ball moves again
     - Inside/outside rolls: ball changes direction, always involves a speed dip through contact
  5. Debounce: ignore any new touch within 200ms of the last detected one
- **Camera orientation**: rear camera pointing **down at ~45°** toward the ball works for ground touches; user prompted with a visual guide overlay on first use
- Returns `{ touchCount, ballDetected }` — `ballDetected` drives a visual indicator on screen

### 3. `components/TrainPage/CameraTimerScreen.tsx` — New screen
- **Full-screen camera preview** via `<Camera>` from `react-native-vision-camera`
- **Overlay layout**:
  ```
  ┌─────────────────────────┐
  │  ⏱ 2:34   [camera feed] │  ← timer top-left
  │                         │
  │         247             │  ← live touch count, large, centre
  │      touches            │
  │   🟢 Ball detected      │  ← status indicator
  │                         │
  │  [Reset] [⏸ Pause] [✕] │  ← controls bottom
  └─────────────────────────┘
  ```
- Ball detected indicator: green dot when ball is in frame, grey when not
- Camera faces **rear** by default (pointing at the ball on the ground); toggle to front for juggling
- When timer hits 0: whistle + vibration, calls `onComplete(touchCount)`

### 4. `components/TrainPage/index.tsx` — Integration
- Add a **camera mode toggle** in the timer picker modal (Pro only):
  ```
  ┌────────────────────────────┐
  │ 🤖 AI Count  [  toggle  ] │  ← visible only if isPremium
  │    Uses camera to auto-    │
  │    count your touches      │
  └────────────────────────────┘
  ```
- State: `const [cameraMode, setCameraMode] = useState(false)`
- When timer starts and `cameraMode === true`: render `<CameraTimerScreen>` instead of the existing blue timer modal
- `CameraTimerScreen` calls back with the touch count → passed into `setScoreInput()` → score modal opens pre-filled
- Existing manual flow unchanged for free users and for Pro users with camera mode off

### 5. Camera permission handling
- Request camera permission on toggle-on (not on app start)
- If denied: show alert explaining why, keep camera mode off
- `Camera.requestCameraPermission()` from `react-native-vision-camera`

---

## Pro Gating

Camera mode toggle only visible when `isPremium`. If a free user somehow reaches the camera screen, it redirects to paywall. No changes needed to `usePremium`.

---

## MVP Limitations (honest)
- Ball tracking accuracy depends on lighting and background contrast — works best on a plain surface
- Ground touches where the ball barely moves (slow toe-taps) may be harder to detect; user can always adjust count
- First version won't use a trained ML model — pure motion/geometry detection
- Camera needs a reasonably clear view of the ball — phone propped up or held works, pocket does not

A trained CoreML model (YOLOv8-nano fine-tuned on soccer balls) can be added in v2 to improve accuracy across all touch types.

---

## Verification
1. Pro user: camera mode toggle appears in timer picker
2. Camera opens → ball visible → green indicator → touch counter increments in real time
3. Timer ends → score modal pre-filled with AI count → user adjusts + saves
4. Session logged correctly to `daily_sessions`
5. Free user: camera toggle not shown, existing manual flow unchanged
