import { Spacing } from '@/constants/theme';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';
import ProgressTile from './ProgressTile';

const ProgressSecttion = () => {
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      <Text>{t('progress.title')}</Text>
      <ProgressTile />
    </View>
  );
};

export default ProgressSecttion;

const styles = StyleSheet.create({
  container: {
    marginTop: Spacing.margin,
  },
});
