import { Typography } from '@/constants/theme';
import { CircleUserRound } from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

const Header = () => {
  const { t } = useTranslation();
  return (
    <View style={styles.headerSection}>
      <Text style={styles.header}>{t('juggle.title')}</Text>
      <CircleUserRound size={24} />
    </View>
  );
};

export default Header;

const styles = StyleSheet.create({
  headerSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  header: Typography.mainHeader,
});
