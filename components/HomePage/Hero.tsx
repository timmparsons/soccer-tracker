import { ColorsNew, Spacing, Typography } from '@/constants/theme';
import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

const HeroSection = () => {
  return (
    <View style={styles.container}>
      <View style={styles.imageWrapper}>
        <Image
          source={{
            uri: 'https://cdn-icons-png.flaticon.com/512/4370/4370770.png', // sample soccer kid image
          }}
          style={styles.image}
        />
      </View>
      <Text style={styles.title}>Keep Juggling, Keep Growing!</Text>
      <Text style={styles.subtitle}>
        Track your practice and become a juggling champion
      </Text>
    </View>
  );
};

export default HeroSection;

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#F3F7FD',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.lg,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 3,
    marginTop: Spacing.lg,
  },
  imageWrapper: {
    backgroundColor: '#FFFFFF',
    borderRadius: 100,
    padding: 12,
    marginBottom: Spacing.md,
  },
  image: {
    width: 80,
    height: 80,
    resizeMode: 'contain',
  },
  title: {
    ...Typography.sectionTitle,
    fontSize: 20,
    fontWeight: '700',
    color: ColorsNew.textPrimary,
    textAlign: 'center',
    marginBottom: 6,
  },
  subtitle: {
    ...Typography.caption,
    textAlign: 'center',
    color: ColorsNew.textSecondary,
    fontSize: 15,
    lineHeight: 22,
  },
});
