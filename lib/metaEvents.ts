import { Platform } from 'react-native';

export function initMetaSdk() {
  if (Platform.OS === 'web') return;
  const { Settings } = require('react-native-fbsdk-next');
  console.log('[meta] initMetaSdk called');
  try {
    Settings.initializeSDK();
    console.log('[meta] Settings.initializeSDK() succeeded');
  } catch (e) {
    console.log('[meta] Settings.initializeSDK() threw', e);
  }
}

export function logSignupComplete() {
  if (Platform.OS === 'web') return;
  const { AppEventsLogger } = require('react-native-fbsdk-next');
  console.log('[meta] logSignupComplete called');
  try {
    AppEventsLogger.logEvent(AppEventsLogger.AppEvents.CompletedRegistration);
    console.log('[meta] logEvent(CompletedRegistration) called');
  } catch (e) {
    console.log('[meta] logEvent threw', e);
  }
}
