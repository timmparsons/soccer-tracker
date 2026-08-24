import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

const DANGER_HOUR = 19; // 7pm local — pill/UI turns danger state
const NOTIFICATION_HOUR = 20; // 8pm local — reminder notification
const STREAK_DANGER_ID = 'streak-danger';

export function isStreakInDanger(
  currentStreak: number,
  todayTouches: number,
  now: Date = new Date(),
): boolean {
  return currentStreak > 0 && todayTouches === 0 && now.getHours() >= DANGER_HOUR;
}

// Schedules (or cancels) the 8pm "protect your streak" reminder. Safe to call
// repeatedly — uses a stable identifier so it never collides with or gets
// wiped by lib/notifications.ts's blanket cancelAllScheduledNotificationsAsync.
export async function syncStreakDangerNotification(
  currentStreak: number,
  todayTouches: number,
  now: Date = new Date(),
): Promise<void> {
  if (Platform.OS === 'web') return;

  const hasTrainedToday = todayTouches > 0;
  if (hasTrainedToday || currentStreak <= 0) {
    await Notifications.cancelScheduledNotificationAsync(STREAK_DANGER_ID).catch(() => {});
    return;
  }

  const { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') return;

  const triggerDate = new Date(now);
  triggerDate.setHours(NOTIFICATION_HOUR, 0, 0, 0);

  if (triggerDate <= now) {
    // Already past 8pm — the in-app danger pill covers it, no point notifying now.
    return;
  }

  await Notifications.scheduleNotificationAsync({
    identifier: STREAK_DANGER_ID,
    content: {
      title: 'Your streak is on the line',
      body: `${currentStreak} day${currentStreak === 1 ? '' : 's'} in a row — get a touch in tonight before it resets.`,
      sound: true,
      ...(Platform.OS === 'android' && { channelId: 'reminders' }),
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: triggerDate },
  });
}
