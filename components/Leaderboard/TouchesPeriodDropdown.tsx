import { Ionicons } from '@expo/vector-icons';
import { useRef, useState } from 'react';
import {
  Dimensions,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

export type TouchesPeriod = 'today' | 'week';

interface Props {
  active: TouchesPeriod;
  onChange: (period: TouchesPeriod) => void;
}

const LABELS: Record<TouchesPeriod, string> = {
  today: 'Today',
  week: 'This Week',
};

const OPTIONS: TouchesPeriod[] = ['today', 'week'];

const SCREEN_WIDTH = Dimensions.get('window').width;

const TouchesPeriodDropdown = ({ active, onChange }: Props) => {
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState({ top: 0, right: 0 });
  const triggerRef = useRef<View>(null);

  const handleOpen = () => {
    triggerRef.current?.measureInWindow((x, y, width, height) => {
      setAnchor({ top: y + height + 6, right: SCREEN_WIDTH - (x + width) });
      setOpen(true);
    });
  };

  return (
    <View ref={triggerRef} collapsable={false}>
      <TouchableOpacity
        style={styles.trigger}
        onPress={handleOpen}
        activeOpacity={0.7}
      >
        <Text style={styles.triggerText}>{LABELS[active]}</Text>
        <Ionicons name='chevron-down' size={14} color='#FFF' />
      </TouchableOpacity>

      <Modal
        transparent
        visible={open}
        animationType='fade'
        onRequestClose={() => setOpen(false)}
      >
        <Pressable style={styles.overlay} onPress={() => setOpen(false)}>
          <View style={[styles.menu, { top: anchor.top, right: anchor.right }]}>
            {OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt}
                style={styles.menuRow}
                onPress={() => {
                  onChange(opt);
                  setOpen(false);
                }}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.menuRowText,
                    active === opt && styles.menuRowTextActive,
                  ]}
                >
                  {LABELS[opt]}
                </Text>
                {active === opt && (
                  <Ionicons name='checkmark' size={16} color='#1f89ee' />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
};

export default TouchesPeriodDropdown;

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ffb724',
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  triggerText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFF',
  },
  overlay: {
    flex: 1,
  },
  menu: {
    position: 'absolute',
    backgroundColor: '#FFF',
    borderRadius: 14,
    paddingVertical: 6,
    minWidth: 140,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  menuRowText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1a1a2e',
  },
  menuRowTextActive: {
    color: '#1f89ee',
  },
});
