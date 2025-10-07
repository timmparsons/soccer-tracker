import { Spacing } from '@/constants/theme';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

type Props = {
  icon: React.ElementType;
  iconColor: string;
  iconBackground: string;
  title: string;
  subtitle: string;
  strokeWidth?: number;
};

const WideTile = ({
  icon: Icon,
  iconColor,
  iconBackground,
  title,
  subtitle,
}: Props) => {
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <View style={[styles.iconWrapper, { backgroundColor: iconBackground }]}>
          <Icon size={22} color={iconColor} />
        </View>
        <View style={styles.streakContainer}>
          <Text style={styles.value}>{title}</Text>
          <Text style={styles.label}>{subtitle}</Text>
        </View>
      </View>
    </View>
  );
};

export default WideTile;

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
    marginTop: Spacing.md,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconWrapper: {
    borderRadius: 50,
    padding: 8,
    marginRight: 10,
  },
  streakContainer: {
    flex: 1,
  },
  bestContainer: {
    alignItems: 'flex-end',
  },
  label: {
    fontSize: 14,
    color: '#6b7280',
  },
  value: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  bestValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2563eb',
  },
});
