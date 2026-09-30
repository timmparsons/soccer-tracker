import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface Props {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  label: string;
  subtitle?: string;
  onPress: () => void;
  disabled?: boolean;
}

const QuickLaunchButton = ({ icon, iconColor, label, subtitle, onPress, disabled }: Props) => {
  return (
    <TouchableOpacity
      style={[styles.button, disabled && styles.buttonDisabled]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.85}
    >
      <Ionicons name={icon} size={20} color={iconColor} />
      <View style={styles.textContainer}>
        {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        <Text style={styles.label} numberOfLines={1}>{label}</Text>
      </View>
      <Ionicons name='chevron-forward' size={18} color='#78909C' />
    </TouchableOpacity>
  );
};

export default QuickLaunchButton;

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#EEF2F6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  textContainer: {
    flex: 1,
  },
  subtitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#78909C',
    marginBottom: 2,
  },
  label: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1a1a2e',
  },
});
