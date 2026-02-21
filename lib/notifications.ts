import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Must be set at module load time so iOS knows how to display notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const DAYS_BEFORE_FIRST_REMINDER = 2;
const TOTAL_REMINDER_DAYS = 7;
const REMINDER_HOUR = 15; // 3pm local time

function getReminderMessage(daysSinceLastSession: number): { title: string; body: string } {
  if (daysSinceLastSession === 2) {
    return {
      title: 'Time to practice!',
      body: "⚽ You haven't trained in 2 days. Lace up!",
    };
  }
  if (daysSinceLastSession === 3) {
    return {
      title: 'Missing the ball?',
      body: '🔥 3 days without a touch — get back out there!',
    };
  }
  return {
    title: `Day ${daysSinceLastSession} without practice`,
    body: `💪 Day ${daysSinceLastSession} — your skills need you. Go practice!`,
  };
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'web') return false;

  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;
  if (existing === 'denied') return false;

  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export async function scheduleInactivityReminders(): Promise<void> {
  if (Platform.OS === 'web') return;

  const { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') return;

  // Cancel all previously scheduled reminders before rescheduling
  await Notifications.cancelAllScheduledNotificationsAsync();

  const now = new Date();

  for (let i = 0; i < TOTAL_REMINDER_DAYS; i++) {
    const dayOffset = DAYS_BEFORE_FIRST_REMINDER + i;
    const triggerDate = new Date(now);
    triggerDate.setDate(triggerDate.getDate() + dayOffset);
    triggerDate.setHours(REMINDER_HOUR, 0, 0, 0);

    // Skip if the trigger time is already in the past (e.g. same day after 3pm)
    if (triggerDate <= now) continue;

    const { title, body } = getReminderMessage(dayOffset);

    await Notifications.scheduleNotificationAsync({
      content: { title, body, sound: true },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: triggerDate },
    });
  }
}

export async function cancelAllReminders(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}
