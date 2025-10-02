import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

const Streak = () => {
  const { t } = useTranslation();
  const streakCount = 5; // Example streak value

  return (
    <View>
      <Text>{t('streak.title')}</Text>
      <Text>{t('streak.streak', { count: streakCount })}</Text>
    </View>
  );
};

export default Streak;

const styles = StyleSheet.create({});
