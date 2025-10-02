// lib/i18n.ts
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import enUS from '../locales/en-US.json';

i18n.use(initReactI18next).init({
  compatibilityJSON: 'v4', // required for React Native
  lng: 'en-US',
  fallbackLng: 'en-US',
  resources: {
    'en-US': { translation: enUS },
  },
  interpolation: {
    escapeValue: false, // react already safes from xss
  },
});

export default i18n;
