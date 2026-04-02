# Challenge Push Notifications

Push notifications for the player challenge feature. The challenge UI and DB are already set up — this is the remaining wiring to notify opponents when challenges are sent, accepted, or completed.

---

## Step 1 — Get your EAS project ID

Find it in `app.json` under `expo.extra.eas.projectId`, or run:

```bash
eas project:info
```

---

## Step 2 — Update `setupNotifications` in `app/_layout.tsx`

After the `requestNotificationPermission()` check, add token registration:

```ts
const setupNotifications = async (userId: string) => {
  const granted = await requestNotificationPermission();
  if (!granted) return;

  // Save push token to profile so other users can notify this device
  try {
    const { data: tokenData } = await Notifications.getExpoPushTokenAsync({
      projectId: 'YOUR_EAS_PROJECT_ID',
    });
    await supabase
      .from('profiles')
      .update({ expo_push_token: tokenData })
      .eq('id', userId);
  } catch {
    // Non-fatal
  }

  const { data: lastSession } = await supabase
    .from('daily_sessions')
    .select('date')
    .eq('user_id', userId)
    .order('date', { ascending: false })
    .limit(1)
    .single();

  if (lastSession?.date) {
    const [year, month, day] = lastSession.date.split('-').map(Number);
    await scheduleInactivityReminders(new Date(year, month - 1, day));
  }
};
```

`Notifications` is already imported in `_layout.tsx` — no new import needed.

---

## Step 3 — Create the Supabase Edge Function

```bash
npx supabase functions new send-push
```

Replace `supabase/functions/send-push/index.ts` with:

```ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

serve(async (req) => {
  const { to, title, body } = await req.json();
  if (!to) return new Response('Missing token', { status: 400 });

  const res = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ to, title, body, sound: 'default' }),
  });

  const data = await res.json();
  return new Response(JSON.stringify(data), {
    headers: { 'Content-Type': 'application/json' },
  });
});
```

Deploy:

```bash
npx supabase functions deploy send-push
```

---

## Step 4 — Wire up notifications in `hooks/usePlayerChallenges.ts`

Add this helper at the top of the file (after imports):

```ts
async function sendPushToUser(userId: string, title: string, body: string) {
  const { data } = await supabase
    .from('profiles')
    .select('expo_push_token')
    .eq('id', userId)
    .single();
  if (!data?.expo_push_token) return;

  await supabase.functions.invoke('send-push', {
    body: { to: data.expo_push_token, title, body },
  });
}
```

Then call it inside each mutation's `onSuccess`:

### `useSendChallenge`
```ts
onSuccess: (_data, vars) => {
  queryClient.invalidateQueries({ queryKey: ['player-challenges', vars.challengerId] });
  // Notify the challenged player
  sendPushToUser(
    vars.challengedId,
    '⚔️ New Challenge!',
    `Someone challenged you to ${vars.touchesTarget} touches. You have 24h to accept.`,
  );
},
```

### `useRespondToChallenge`
This mutation doesn't currently have access to the challenger/challenged IDs — pass them in as extra vars:

```ts
// Update the mutationFn signature to also accept challengerId and challengedId:
mutationFn: async ({
  challengeId,
  accept,
  timeLimitHours,
  challengerId,    // add
  challengedId,    // add
  myId,            // add — the person responding
}: { ... }) => { ... }

// Then in onSuccess:
onSuccess: (_data, vars) => {
  queryClient.invalidateQueries({ queryKey: ['player-challenges'] });
  const notifyId = vars.myId === vars.challengerId ? vars.challengedId : vars.challengerId;
  sendPushToUser(
    notifyId,
    vars.accept ? '✅ Challenge Accepted!' : '❌ Challenge Declined',
    vars.accept
      ? 'Your challenge was accepted. Get ready!'
      : 'Your challenge was declined.',
  );
},
```

Update the `onRespond` call in `ChallengesCard.tsx` to pass the new fields:
```ts
onRespond={(accept) =>
  respond({
    challengeId: c.id,
    accept,
    timeLimitHours: c.time_limit_hours,
    challengerId: c.challenger_id,
    challengedId: c.challenged_id,
    myId: userId,
  })
}
```

### `useCompleteChallenge`
```ts
// After setting status = 'completed' and winner_id, notify the opponent:
onSuccess: (_data, vars) => {
  queryClient.invalidateQueries({ queryKey: ['player-challenges'] });
  const opponentId = vars.userId === vars.challengerId ? vars.challengedId : vars.challengerId;
  // Only notify when both are done (status becomes 'completed')
  const bothDone =
    (vars.userId === vars.challengerId && vars.existingChallengedTime !== null) ||
    (vars.userId === vars.challengedId && vars.existingChallengerTime !== null);
  if (bothDone) {
    sendPushToUser(opponentId, '🏆 Results are in!', 'Tap to see who won the challenge.');
  }
},
```

---

## Checklist

- [ ] EAS project ID confirmed
- [ ] `setupNotifications` updated in `app/_layout.tsx`
- [ ] Edge Function `send-push` created and deployed
- [ ] `sendPushToUser` helper added to `hooks/usePlayerChallenges.ts`
- [ ] `useSendChallenge` onSuccess wired
- [ ] `useRespondToChallenge` updated with extra ID params + onSuccess wired
- [ ] `useCompleteChallenge` onSuccess wired
- [ ] `ChallengesCard.tsx` `onRespond` call updated with new params
