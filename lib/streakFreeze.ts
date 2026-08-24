import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocalDate } from '@/utils/getLocalDate';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

const FREEZE_NOTIFIED_KEY_PREFIX = 'freezeNotified:lastDate:';

// frozenDates has no persisted "seen" state — it's fully re-derived from
// activity dates on every load — so a fresh freeze only shows up as
// yesterday's date newly appearing in the list. We only ever alert on
// yesterday specifically (not "any date we haven't notified yet") so
// existing users don't get backfilled notifications for old frozen days
// once this ships. The AsyncStorage key just guards against re-notifying
// on every subsequent app open the same day.
export async function syncFreezeUsedNotification(
  userId: string,
  frozenDates: string[],
  freezesAvailable: number,
  now: Date = new Date(),
): Promise<void> {
  if (Platform.OS === 'web' || frozenDates.length === 0) return;

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = getLocalDate(yesterday);

  if (!frozenDates.includes(yesterdayStr)) return;

  const key = `${FREEZE_NOTIFIED_KEY_PREFIX}${userId}`;
  const lastNotified = await AsyncStorage.getItem(key);
  if (lastNotified === yesterdayStr) return;
  await AsyncStorage.setItem(key, yesterdayStr);

  const { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') return;

  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Coach Vinnie',
      body: `Freeze used — your streak's still alive. ${freezesAvailable} freeze${freezesAvailable === 1 ? '' : 's'} left, don't waste ${freezesAvailable === 1 ? 'it' : 'them'}.`,
      sound: true,
      ...(Platform.OS === 'android' && { channelId: 'reminders' }),
    },
    trigger: null,
  });
}
