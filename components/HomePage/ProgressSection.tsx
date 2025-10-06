import { Spacing, Typography } from '@/constants/theme';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';
import ProgressTile from './ProgressTile';

const ProgressSecttion = () => {
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <Text style={styles.header}>{t('progress.title')}</Text>
        <Text>{t('common.viewAll')}</Text>
      </View>
      <ProgressTile />
    </View>
  );
};

export default ProgressSecttion;

const styles = StyleSheet.create({
  container: {
    marginTop: Spacing.lg,
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  header: Typography.mainHeader,
});
