import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

const Hero = () => {
  const { t } = useTranslation();

  return (
    <View>
      <Text>{t('juggle.hero')}</Text>
      <Text>{t('juggle.description')}</Text>
    </View>
  );
};

export default Hero;

const styles = StyleSheet.create({});
