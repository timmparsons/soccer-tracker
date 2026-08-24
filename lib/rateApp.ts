import AsyncStorage from '@react-native-async-storage/async-storage';
import * as StoreReview from 'expo-store-review';
import { Alert } from 'react-native';

const LAST_PROMPTED_KEY = 'rateApp:lastPromptedAt';
const PROMPT_COOLDOWN_MS = 90 * 24 * 60 * 60 * 1000;

export function promptForReview(onDecline?: () => void) {
  Alert.alert('Enjoying Master Touch?', "We'd love to hear your feedback!", [
    {
      text: 'Not really',
      style: 'cancel',
      onPress: onDecline,
    },
    {
      text: 'Yes!',
      onPress: async () => {
        if (await StoreReview.hasAction()) {
          StoreReview.requestReview();
        }
      },
    },
  ]);
}

// Only call this at a genuine "win" moment (e.g. a new PR) — not from a settings
// button, which should always prompt via promptForReview() directly.
export async function maybePromptForReviewAfterPR() {
  const lastPrompted = await AsyncStorage.getItem(LAST_PROMPTED_KEY);
  const lastPromptedAt = lastPrompted ? Number(lastPrompted) : 0;
  if (Date.now() - lastPromptedAt < PROMPT_COOLDOWN_MS) return;

  await AsyncStorage.setItem(LAST_PROMPTED_KEY, String(Date.now()));
  promptForReview();
}
