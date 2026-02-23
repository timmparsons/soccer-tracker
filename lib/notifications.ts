import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Must be set at module load time so iOS knows how to display notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// Android 8+ requires a notification channel
if (Platform.OS === 'android') {
  Notifications.setNotificationChannelAsync('reminders', {
    name: 'Practice Reminders',
    importance: Notifications.AndroidImportance.HIGH,
    sound: 'default',
  });
}

const DAYS_BEFORE_FIRST_REMINDER = 2;
const TOTAL_REMINDER_DAYS = 7;
const REMINDER_HOUR = 15; // 3pm local time

function getReminderMessage(daysSinceLastSession: number): { title: string; body: string } {
  if (daysSinceLastSession === 2) {
    return {
      title: 'Coach Vinnie here! 👟',
      body: "Two days off? The ball's getting lonely. Lace up!",
    };
  }
  if (daysSinceLastSession === 3) {
    return {
      title: 'Coach Vinnie calling... ⚽',
      body: "3 days without a touch. I'm not angry, I'm disappointed.",
    };
  }
  if (daysSinceLastSession === 4) {
    return {
      title: 'Coach Vinnie 😤',
      body: "4 days?! Your boots are collecting dust. Get out there!",
    };
  }
  if (daysSinceLastSession === 5) {
    return {
      title: 'Coach Vinnie 😤',
      body: "5 days. FIVE. Champions don't take this long off.",
    };
  }
  return {
    title: `Coach Vinnie — Day ${daysSinceLastSession} 😤`,
    body: `${daysSinceLastSession} days without training. I didn't coach you to give up. Go!`,
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
      content: { title, body, sound: true, ...(Platform.OS === 'android' && { channelId: 'reminders' }) },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: triggerDate },
    });
  }
}

export async function cancelAllReminders(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}
