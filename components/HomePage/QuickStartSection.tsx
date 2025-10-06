import { Spacing, Typography } from '@/constants/theme';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';
import QuickStartTile from './QuickStartTile';

const QuickStartSection = () => {
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <Text style={styles.header}>{t('quickStart.Title')}</Text>
      </View>
      <QuickStartTile
        icon={'play'}
        iconColor={'#2563eb'}
        iconBackground={'#dbeafe'}
        title={t('quickStart.practiceTitle')}
        subtitle={t('quickStart.practiceSubTitle')}
      />
      <QuickStartTile
        icon='stats-chart'
        iconColor='#16a34a'
        iconBackground='#dcfce7'
        title={t('quickStart.challengeTitle')}
        subtitle={t('quickStart.challengeSubTitle')}
      />
    </View>
  );
};

export default QuickStartSection;

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
