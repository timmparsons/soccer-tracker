import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export type CompeteView = 'touches' | 'juggling';

interface Props {
  active: CompeteView;
  onChange: (view: CompeteView) => void;
}

const OPTIONS: { key: CompeteView; label: string }[] = [
  { key: 'touches', label: 'Touches' },
  { key: 'juggling', label: 'Juggling' },
];

const Switcher = ({ active, onChange }: Props) => {
  return (
    <View style={styles.subTabsRow}>
      {OPTIONS.map((opt) => (
        <TouchableOpacity
          key={opt.key}
          style={[styles.subTab, active === opt.key && styles.subTabActive]}
          onPress={() => onChange(opt.key)}
        >
          <Text
            style={[
              styles.subTabText,
              active === opt.key && styles.subTabTextActive,
            ]}
            numberOfLines={1}
          >
            {opt.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

export default Switcher;

const styles = StyleSheet.create({
  subTabsRow: {
    flexDirection: 'row',
    backgroundColor: '#F0F4F8',
    borderRadius: 10,
    padding: 3,
  },
  subTab: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 8,
  },
  subTabActive: {
    backgroundColor: '#FFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  subTabText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#78909C',
  },
  subTabTextActive: {
    color: '#1a1a2e',
  },
});
