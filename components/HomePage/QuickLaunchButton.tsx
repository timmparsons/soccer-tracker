import { Ionicons } from '@expo/vector-icons';
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
      style={[styles.button, completed && styles.buttonCompleted, disabled && styles.buttonDisabled]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.85}
    >
      <Ionicons name={completed ? 'checkmark-circle' : icon} size={20} color={completed ? '#31af4d' : iconColor} />
      <View style={styles.textContainer}>
        {subtitle && (
          <Text style={[styles.subtitle, completed && styles.subtitleCompleted]}>
            {completed ? `${subtitle} · Completed` : subtitle}
          </Text>
        )}
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
  buttonCompleted: {
    backgroundColor: '#F1FAF3',
    borderColor: '#CDEBD4',
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
  subtitleCompleted: {
    color: '#31af4d',
  },
  label: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1a1a2e',
  },
});
