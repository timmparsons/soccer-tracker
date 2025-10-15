import { Spacing, Typography } from '@/constants/theme';
import { router } from 'expo-router';
import { ChartColumnIncreasing, Play } from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import WideTile from '../common/WideTile';

const QuickStartSection = () => {
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <Text style={styles.header}>{t('quickStart.Title')}</Text>
      </View>
      <TouchableOpacity onPress={() => router.push('/play')}>
        <WideTile
          icon={Play}
          iconColor={'#2563eb'}
          iconBackground={'#dbeafe'}
          title={t('quickStart.practiceTitle')}
          subtitle={t('quickStart.practiceSubTitle')}
        />
      </TouchableOpacity>
      <WideTile
        icon={ChartColumnIncreasing}
        iconColor='#c67524ff'
        iconBackground='#f4cb79ff'
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
    paddingHorizontal: Spacing.lg,
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  header: Typography.mainHeader,
});
