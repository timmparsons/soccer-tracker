import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export type TouchesScope = 'team' | 'club' | 'global';

interface Props {
  active: TouchesScope;
  onChange: (scope: TouchesScope) => void;
  clubEnabled: boolean;
}

const OPTIONS: { key: TouchesScope; label: string }[] = [
  { key: 'team', label: 'Team' },
  { key: 'club', label: 'Club' },
  { key: 'global', label: 'Global' },
];

const TouchesScopeSwitcher = ({ active, onChange, clubEnabled }: Props) => {
  return (
    <View style={styles.row}>
      {OPTIONS.map((opt) => {
        const disabled = opt.key === 'club' && !clubEnabled;
        return (
          <TouchableOpacity
            key={opt.key}
            style={[styles.pill, active === opt.key && styles.pillActive]}
            onPress={() => onChange(opt.key)}
            disabled={disabled}
          >
            <Text
              style={[
                styles.pillText,
                active === opt.key && styles.pillTextActive,
                disabled && styles.pillTextDisabled,
              ]}
              numberOfLines={1}
            >
              {opt.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

export default TouchesScopeSwitcher;

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  pill: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: '#F0F4F8',
  },
  pillActive: {
    backgroundColor: '#1f89ee',
  },
  pillText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#78909C',
  },
  pillTextActive: {
    color: '#FFF',
  },
  pillTextDisabled: {
    color: '#C0C8CE',
  },
});
