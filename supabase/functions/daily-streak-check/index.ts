import { createClient } from 'jsr:@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

// --- Ported from lib/streak.ts (kept in sync manually — pure function, no RN deps) ---

const FREEZE_EARN_CADENCE_DAYS = 14;
const MAX_BANKED_FREEZES = 2;

interface StreakStats {
  currentStreak: number;
  longestStreak: number;
  freezesAvailable: number;
  frozenDates: string[];
}

const toLocalDate = (dateStr: string): Date => new Date(dateStr + 'T00:00:00');

const addDays = (date: Date, days: number): Date => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

const toDateStr = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

function calculateStreak(activeDates: string[], today: Date = new Date()): StreakStats {
  const activeSet = new Set(activeDates);
  const sortedDates = [...activeSet].sort();

  if (sortedDates.length === 0) {
    return { currentStreak: 0, longestStreak: 0, freezesAvailable: 0, frozenDates: [] };
  }

  const todayStr = toDateStr(today);
  const yesterdayLocal = toLocalDate(toDateStr(addDays(today, -1)));

  let streakLength = 0;
  let longestStreak = 0;
  let freezesAvailable = 0;
  let daysSinceLastFreezeEarned = 0;
  let streakActive = false;
  let frozenDates: string[] = [];
  let pendingFrozenDate: string | null = null;

  const earliest = toLocalDate(sortedDates[0]);
  const lastWalkDay = yesterdayLocal < earliest ? earliest : yesterdayLocal;

  const resetStreak = () => {
    streakLength = 0;
    freezesAvailable = 0;
    daysSinceLastFreezeEarned = 0;
    streakActive = false;
    frozenDates = [];
    pendingFrozenDate = null;
  };

  const maybeEarnFreeze = () => {
    if (daysSinceLastFreezeEarned >= FREEZE_EARN_CADENCE_DAYS && freezesAvailable < MAX_BANKED_FREEZES) {
      freezesAvailable++;
      daysSinceLastFreezeEarned = 0;
    }
  };

  for (let cursor = earliest; cursor <= lastWalkDay; cursor = addDays(cursor, 1)) {
    const cursorStr = toDateStr(cursor);

    if (activeSet.has(cursorStr)) {
      pendingFrozenDate = null;
      streakLength++;
      daysSinceLastFreezeEarned++;
      streakActive = true;
      longestStreak = Math.max(longestStreak, streakLength);
      maybeEarnFreeze();
    } else if (streakActive) {
      if (pendingFrozenDate !== null || freezesAvailable === 0) {
        resetStreak();
      } else {
        freezesAvailable--;
        pendingFrozenDate = cursorStr;
        frozenDates.push(cursorStr);
        daysSinceLastFreezeEarned++;
        maybeEarnFreeze();
      }
    }
  }

  let currentStreak = streakLength;
  if (activeSet.has(todayStr)) {
    currentStreak++;
    longestStreak = Math.max(longestStreak, currentStreak);
  }

  return { currentStreak, longestStreak, freezesAvailable, frozenDates };
}

// --- Ported from lib/notifications.ts ---

function getReminderMessage(daysSinceLastSession: number): { title: string; body: string } {
  if (daysSinceLastSession === 2) {
    return { title: 'Coach Vinnie here! 👟', body: "Two days off? The ball's getting lonely. Lace up!" };
  }
  if (daysSinceLastSession === 3) {
    return { title: 'Coach Vinnie calling... ⚽', body: "3 days without a touch. I'm not angry, I'm disappointed." };
  }
  if (daysSinceLastSession === 4) {
    return { title: 'Coach Vinnie 😤', body: '4 days?! Your boots are collecting dust. Get out there!' };
  }
  if (daysSinceLastSession === 5) {
    return { title: 'Coach Vinnie 😤', body: "5 days. FIVE. Champions don't take this long off." };
  }
  return {
    title: `Coach Vinnie — Day ${daysSinceLastSession} 😤`,
    body: `${daysSinceLastSession} days without training. I didn't coach you to give up. Go!`,
  };
}

const DAYS_BEFORE_FIRST_REMINDER = 2;
const TOTAL_REMINDER_DAYS = 7;
const LAST_REMINDER_DAY = DAYS_BEFORE_FIRST_REMINDER + TOTAL_REMINDER_DAYS - 1; // 8

// --- Cron entrypoint ---
// Single source of truth for "haven't trained" / "freeze used" pushes, replacing
// the old per-device local-notification scheduling (lib/notifications.ts,
// lib/streakFreeze.ts) which went stale whenever a different device on the same
// account logged the session that should have reset/cancelled the reminder.

Deno.serve(async (_req) => {
  const now = new Date();
  const todayStr = toDateStr(now);
  const yesterdayStr = toDateStr(addDays(now, -1));

  const [{ data: sessions }, { data: attempts }, { data: profiles }, { data: tokenRows }] = await Promise.all([
    supabase.from('daily_sessions').select('user_id, date'),
    supabase.from('sprint_attempts').select('profile_id, daily_sprints(date)'),
    supabase.from('profiles').select('id, last_reminder_notified_at, last_freeze_notified_at'),
    supabase.from('push_tokens').select('user_id, token'),
  ]);

  // "Last trained" for the inactivity chain is daily_sessions only (matches the
  // old client behavior in app/_layout.tsx). Streak/freeze status is sessions +
  // sprint attempts combined (matches hooks/useTouchTracking.ts's useActiveStreak).
  const sessionDatesByUser = new Map<string, string[]>();
  const activeDatesByUser = new Map<string, Set<string>>();

  for (const s of sessions ?? []) {
    if (!s.user_id) continue;
    if (!sessionDatesByUser.has(s.user_id)) sessionDatesByUser.set(s.user_id, []);
    sessionDatesByUser.get(s.user_id)!.push(s.date);
    if (!activeDatesByUser.has(s.user_id)) activeDatesByUser.set(s.user_id, new Set());
    activeDatesByUser.get(s.user_id)!.add(s.date);
  }

  for (const a of (attempts ?? []) as { profile_id: string; daily_sprints: { date: string } | null }[]) {
    if (!a.profile_id || !a.daily_sprints?.date) continue;
    if (!activeDatesByUser.has(a.profile_id)) activeDatesByUser.set(a.profile_id, new Set());
    activeDatesByUser.get(a.profile_id)!.add(a.daily_sprints.date);
  }

  const tokensByUser = new Map<string, string[]>();
  for (const t of tokenRows ?? []) {
    if (!tokensByUser.has(t.user_id)) tokensByUser.set(t.user_id, []);
    tokensByUser.get(t.user_id)!.push(t.token);
  }

  const messages: { to: string; title: string; body: string; sound: string }[] = [];
  const reminderUpdates: string[] = [];
  const freezeUpdates: string[] = [];

  for (const profile of profiles ?? []) {
    const tokens = tokensByUser.get(profile.id);
    if (!tokens || tokens.length === 0) continue; // nobody to notify

    // Inactivity chain
    const sessionDates = sessionDatesByUser.get(profile.id);
    if (sessionDates && sessionDates.length > 0 && profile.last_reminder_notified_at !== todayStr) {
      const lastSessionStr = [...sessionDates].sort().at(-1)!;
      const daysSince = Math.round(
        (toLocalDate(todayStr).getTime() - toLocalDate(lastSessionStr).getTime()) / 86400000,
      );
      if (daysSince >= DAYS_BEFORE_FIRST_REMINDER && daysSince <= LAST_REMINDER_DAY) {
        const { title, body } = getReminderMessage(daysSince);
        for (const token of tokens) messages.push({ to: token, title, body, sound: 'default' });
        reminderUpdates.push(profile.id);
      }
    }

    // Freeze used
    const activeDates = activeDatesByUser.get(profile.id);
    if (activeDates && activeDates.size > 0 && profile.last_freeze_notified_at !== yesterdayStr) {
      const stats = calculateStreak([...activeDates], now);
      if (stats.frozenDates.includes(yesterdayStr)) {
        const body = `Freeze used — your streak's still alive. ${stats.freezesAvailable} freeze${stats.freezesAvailable === 1 ? '' : 's'} left, don't waste ${stats.freezesAvailable === 1 ? 'it' : 'them'}.`;
        for (const token of tokens) messages.push({ to: token, title: 'Coach Vinnie', body, sound: 'default' });
        freezeUpdates.push(profile.id);
      }
    }
  }

  for (let i = 0; i < messages.length; i += 100) {
    const batch = messages.slice(i, i + 100);
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(batch),
    }).catch((err) => console.error('Expo push send failed:', err));
  }

  if (reminderUpdates.length > 0) {
    await supabase.from('profiles').update({ last_reminder_notified_at: todayStr }).in('id', reminderUpdates);
  }
  if (freezeUpdates.length > 0) {
    await supabase.from('profiles').update({ last_freeze_notified_at: yesterdayStr }).in('id', freezeUpdates);
  }

  return new Response(
    JSON.stringify({ remindersSent: reminderUpdates.length, freezeNotificationsSent: freezeUpdates.length }),
    { headers: { 'Content-Type': 'application/json' } },
  );
});
