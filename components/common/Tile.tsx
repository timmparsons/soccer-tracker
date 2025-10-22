import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type TileProps = {
  icon: React.ElementType;
  iconColor?: string;
  iconBackground?: string;
  title: string;
  subtitle?: string;
  onPress?: () => void;
};

const Tile: React.FC<TileProps> = ({
  icon: Icon,
  iconColor = '#2563eb',
  iconBackground = '#e0f2fe',
  title,
  subtitle,
  onPress,
}) => {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
      <View style={styles.container}>
        <View style={[styles.iconWrapper, { backgroundColor: iconBackground }]}>
          <Icon size={24} color={iconColor} />
        </View>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>
    </TouchableOpacity>
  );
};

export default Tile;

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f9fafb',
    paddingVertical: 20,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 4, // keep some gap between tiles
    width: 160, // optional fixed width for consistent size
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  iconWrapper: {
    borderRadius: 10,
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
