import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { ColorValue, StyleSheet, Text, View } from 'react-native';

type GradientTileProps = {
  title: string;
  subtitle: string;
  icon: React.ElementType;
  colors?: readonly [ColorValue, ColorValue, ...ColorValue[]];
  start?: { x: number; y: number };
  end?: { x: number; y: number };
  padding?: number;
};

const GradientTile: React.FC<GradientTileProps> = ({
  title,
  colors = ['#FFD33D', '#e9913fff'] as const, // default warm orange gradient
  icon: Icon,
  subtitle,
  start = { x: 0, y: 0 },
  end = { x: 1, y: 0 },
  padding = 16,
}) => {
  const hasIcon = !!Icon;
  return (
    <LinearGradient
      colors={colors}
      start={start}
      end={end}
      style={[styles.container, { padding }]}
    >
      {hasIcon && (
        <View style={styles.iconContainer}>
          <Icon size={28} color='#fff' />
        </View>
      )}
      <View>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>
    </LinearGradient>
  );
};

export default GradientTile;

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 6,
    elevation: 3,
  },
  iconContainer: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 12,
    padding: 10,
    marginRight: 12,
  },
  title: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  subtitle: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
    marginTop: 2,
  },
});
