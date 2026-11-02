import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface Props {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  label: string;
  subtitle?: string;
  onPress: () => void;
  disabled?: boolean;
  completed?: boolean;
}

const QuickLaunchButton = ({ icon, iconColor, label, subtitle, onPress, disabled, completed }: Props) => {
  return (
    <TouchableOpacity
      style={[styles.button, disabled && styles.buttonDisabled]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.85}
    >
      <LinearGradient
        colors={completed ? ['#31af4d', '#208a3a'] : ['#0B2A55', '#15457F']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <View style={styles.iconWrap}>
          <Ionicons name={completed ? 'checkmark-circle' : icon} size={22} color={completed ? '#FFFFFF' : iconColor} />
        </View>
        <View style={styles.textContainer}>
          {subtitle && (
            <Text style={styles.subtitle}>
              {completed ? `${subtitle} · Completed` : subtitle}
            </Text>
          )}
          <Text style={styles.label} numberOfLines={1}>{label}</Text>
        </View>
        <Ionicons name='chevron-forward' size={20} color='rgba(255,255,255,0.8)' />
      </LinearGradient>
    </TouchableOpacity>
  );
};

export default QuickLaunchButton;

const styles = StyleSheet.create({
  button: {
    borderRadius: 18,
    shadowColor: '#0B1D3A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 4,
  },
  gradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    flex: 1,
  },
  subtitle: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.7)',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 3,
  },
  label: {
    fontSize: 17,
    fontWeight: '900',
    color: '#FFFFFF',
  },
});
