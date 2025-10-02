import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

const Header = () => {
  const { t } = useTranslation();
  return (
    <View>
      <Text>{t('home.title')}</Text>
      <Text>{t('log.title')}</Text>
    </View>
  );
};

export default Header;

const styles = StyleSheet.create({});
