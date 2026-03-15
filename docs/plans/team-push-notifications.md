# Plan: Team Push Notifications

## Context
When a player logs touches, their teammates currently have no way of knowing until they open the app and check the leaderboard. This plan adds server-side push notifications so teammates get a nudge when someone on their team trains — creating social accountability and motivation.

---

## Architecture

```
Player logs session (any of 3 insert points)
  → daily_sessions INSERT in Supabase
  → Database webhook fires → Edge Function: notify-team-session
      - Is this the player's first session today? (throttle)
      - Fetch player's name + team_id
      - Fetch push_tokens of all other team members
      - POST to Expo Push API for each token
  → Teammates receive push notification
```

Push notifications are sent via the **Expo Push API** (free, no third-party service). Supabase Edge Functions handle the server-side logic.

---

## Throttle Rule
Only notify teammates on the **first session of the day** per player. If a player logs 5 sessions, their team only gets one notification. This prevents spam.

The edge function checks: `SELECT count(*) FROM daily_sessions WHERE user_id = $1 AND date = $2` — if count > 1, skip notification.

---

## Notification Content

```
⚽ Jamie logged 1,250 touches today!
```

If they hit or exceeded their daily target:
```
🎯 Jamie just hit their daily target — 1,000 touches!
```

---

## Database Change

```sql
ALTER TABLE profiles ADD COLUMN push_token TEXT;
```

No index needed — queries will always be by `team_id`, not `push_token` directly.

---

## Step 1: Frontend — Register & Save Push Token

**File:** `lib/notifications.ts`

Add `registerPushToken(userId)` function:
```typescript
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';

export const registerPushToken = async (userId: string) => {
  const { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') return;

  const token = await Notifications.getExpoPushTokenAsync({
    projectId: Constants.expoConfig?.extra?.eas?.projectId,
  });

  await supabase
    .from('profiles')
    .update({ push_token: token.data })
    .eq('id', userId);
};
```

**File:** `app/_layout.tsx`

Call `registerPushToken(userId)` inside `setupNotifications()` after the permission check. It's already fire-and-forget so no change to the startup path.

---

## Step 2: Supabase Edge Function

**File to create in Supabase:** `supabase/functions/notify-team-session/index.ts`

```typescript
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

Deno.serve(async (req) => {
  const payload = await req.json();
  const record = payload.record; // the new daily_sessions row

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  // Throttle: only notify on first session of the day
  const { count } = await supabase
    .from('daily_sessions')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', record.user_id)
    .eq('date', record.date);

  if ((count ?? 0) > 1) {
    return new Response('throttled', { status: 200 });
  }

  // Get the player's profile + team
  const { data: player } = await supabase
    .from('profiles')
    .select('display_name, name, team_id, daily_target_touches:user_targets(daily_target_touches)')
    .eq('id', record.user_id)
    .single();

  if (!player?.team_id) return new Response('no team', { status: 200 });

  const playerName = player.display_name || player.name || 'A teammate';
  const target = player.daily_target_touches?.[0]?.daily_target_touches ?? 1000;
  const hitTarget = record.touches_logged >= target;

  const body = hitTarget
    ? `🎯 ${playerName} just hit their daily target — ${record.touches_logged.toLocaleString()} touches!`
    : `⚽ ${playerName} logged ${record.touches_logged.toLocaleString()} touches today!`;

  // Get all other team members' push tokens
  const { data: teammates } = await supabase
    .from('profiles')
    .select('push_token')
    .eq('team_id', player.team_id)
    .eq('is_coach', false)
    .neq('id', record.user_id)
    .not('push_token', 'is', null);

  if (!teammates || teammates.length === 0) return new Response('no teammates', { status: 200 });

  const messages = teammates.map((t) => ({
    to: t.push_token,
    title: 'Master Touch',
    body,
    sound: 'default',
    data: { type: 'team_session' },
  }));

  // Send via Expo Push API
  await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(messages),
  });

  return new Response('ok', { status: 200 });
});
```

---

## Step 3: Database Webhook

In the Supabase dashboard:
1. Go to **Database → Webhooks**
2. Create webhook:
   - **Name:** `notify-team-session`
   - **Table:** `daily_sessions`
   - **Events:** INSERT only
   - **Type:** Supabase Edge Function
   - **Edge Function:** `notify-team-session`

---

## Files Changed

| File | Change |
|------|--------|
| `lib/notifications.ts` | Add `registerPushToken()` |
| `app/_layout.tsx` | Call `registerPushToken()` in `setupNotifications()` |
| `supabase/functions/notify-team-session/index.ts` | **Create** edge function |

**Database migration:**
```sql
ALTER TABLE profiles ADD COLUMN push_token TEXT;
```

---

## Considerations

- **Coaches are excluded** from receiving or triggering notifications (edge function filters `is_coach = false`)
- **No team = no notification** — solo players aren't bothered
- **Token refresh** — push tokens rarely change but `registerPushToken` runs on every app startup so it stays current
- **Simulator/dev** — Expo push tokens only work on physical devices; use `Constants.appOwnership` check if needed for dev builds

---

## Verification
1. Player A logs a session → Player B (same team) receives push within ~5s
2. Player A logs a second session same day → Player B does NOT get a second notification
3. Player who hits their target → notification says "🎯 hit their daily target"
4. Player on no team logs session → no notification sent
5. App backgrounded on Player B's device → notification appears in system tray
