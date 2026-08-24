import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';

interface Props {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  label: string;
  onPress: () => void;
  disabled?: boolean;
}

const QuickLaunchButton = ({ icon, iconColor, label, onPress, disabled }: Props) => {
  return (
    <TouchableOpacity
      style={[styles.button, disabled && styles.buttonDisabled]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.85}
    >
      <Ionicons name={icon} size={20} color={iconColor} />
      <Text style={styles.label}>{label}</Text>
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
  label: {
    flex: 1,
    fontSize: 14,
    fontWeight: '800',
    color: '#1a1a2e',
  },
});
