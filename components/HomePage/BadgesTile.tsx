import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface IBadgesTileProps {
  icon: React.ReactNode;
  title: string;
  backgroundColor: string;
}

const BadgesTile: React.FC<IBadgesTileProps> = ({
  icon,
  title,
  backgroundColor,
}) => {
  return (
    <View style={[styles.tileContainer, { backgroundColor }]}>
      <View style={styles.icon}>{icon}</View>
      <Text style={styles.title}>{title}</Text>
    </View>
  );
};

export default BadgesTile;

const styles = StyleSheet.create({
  tileContainer: {
    width: 110,
    height: 80,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 3,
    elevation: 2,
  },
  icon: {
    marginBottom: 6,
  },
  title: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
    textAlign: 'center',
  },
});
