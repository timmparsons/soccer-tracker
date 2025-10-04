import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

type TileProps = {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  iconBackground?: string;
  title: string;
  subtitle: string;
};

const Tile: React.FC<TileProps> = ({
  icon,
  iconColor = '#2563eb', // blue default
  iconBackground = '#e0f2fe', // light blue default
  title,
  subtitle,
}) => {
  return (
    <View style={styles.container}>
      <View style={[styles.iconWrapper, { backgroundColor: iconBackground }]}>
        <Ionicons name={icon} size={24} color={iconColor} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </View>
  );
};

export default Tile;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
    paddingVertical: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginHorizontal: 5,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  iconWrapper: {
    borderRadius: 50,
    padding: 12,
    marginBottom: 10,
  },
  title: {
    fontWeight: '600',
    fontSize: 16,
    color: '#111827',
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
});
