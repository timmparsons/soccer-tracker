import { supabase } from '@/lib/supabase';
import { MAX_SESSION_TOUCHES, MAX_SESSION_JUGGLES } from '@/lib/touchLimits';
import { getLocalDate } from '@/utils/getLocalDate';
import { SessionLog } from '@/hooks/useTouchTracking';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const screenHeight = Dimensions.get('window').height;

const FOCUS_AREAS = [
  { key: 'freestyle', label: 'Freestyle' },
  { key: 'juggling', label: 'Juggling' },
  { key: 'dribbling', label: 'Dribbling' },
  { key: 'ball_mastery', label: 'Ball Mastery' },
  { key: 'passing', label: 'Passing' },
  { key: 'first_touch', label: 'First Touch' },
  { key: 'shooting', label: 'Shooting' },
  { key: 'fitness', label: 'Fitness' },
];

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

interface EditSessionModalProps {
  visible: boolean;
  onClose: () => void;
  userId: string;
  session: SessionLog | null;
  onSuccess: () => void;
}

const EditSessionModal = ({ visible, onClose, userId, session, onSuccess }: EditSessionModalProps) => {
  const { bottom: bottomInset } = useSafeAreaInsets();
  const [date, setDate] = useState('');
  const [touches, setTouches] = useState('');
  const [duration, setDuration] = useState('');
  const [juggles, setJuggles] = useState('');
  const [selectedAreas, setSelectedAreas] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (visible && session) {
      setDate(session.date);
      setTouches(String(session.touches_logged));
      setDuration(session.duration_minutes ? String(session.duration_minutes) : '');
      setJuggles(
        session.juggle_count && session.juggle_count !== session.touches_logged
          ? String(session.juggle_count)
          : '',
      );
      setSelectedAreas(session.focus_areas ?? []);
      setSubmitting(false);
    }
  }, [visible, session]);

  if (!session) return null;

  const today = getLocalDate();
  const yesterday = getLocalDate(new Date(Date.now() - 24 * 60 * 60 * 1000));
  const twoDaysAgo = getLocalDate(new Date(Date.now() - 2 * 24 * 60 * 60 * 1000));

  const handleSubmit = async () => {
    if (submitting) return;

    if (!DATE_RE.test(date) || Number.isNaN(new Date(date + 'T00:00:00').getTime())) {
      Alert.alert('Invalid Date', 'Enter the date as YYYY-MM-DD');
      return;
    }
    if (date > today) {
      Alert.alert('Invalid Date', "You can't log a session in the future");
      return;
    }

    const touchCount = touches ? parseInt(touches) : 0;
    const juggleCount = juggles ? parseInt(juggles) : 0;

    if (touchCount <= 0 && juggleCount <= 0) {
      Alert.alert('Invalid Input', 'Please enter touches or a juggling count');
      return;
    }
    if (touchCount > MAX_SESSION_TOUCHES) {
      Alert.alert('Too many touches', `Maximum is ${MAX_SESSION_TOUCHES.toLocaleString()} per session.`);
      return;
    }
    if (juggleCount > MAX_SESSION_JUGGLES) {
      Alert.alert('Too many juggles', `Maximum is ${MAX_SESSION_JUGGLES.toLocaleString()} per session.`);
      return;
    }

    setSubmitting(true);

    const storedTouches = touchCount > 0 ? touchCount : juggleCount;

    try {
      // Insert the corrected row before deleting the old one so a failed
      // delete never loses the session outright — worst case is a
      // duplicate the user can flag, not a vanished one.
      const { error: insertError } = await supabase.from('daily_sessions').insert({
        user_id: userId,
        drill_id: session.drill_id,
        challenge_type: session.challenge_type,
        touches_logged: storedTouches,
        duration_minutes: duration ? parseInt(duration) : null,
        juggle_count: juggleCount > 0 ? juggleCount : null,
        date,
        focus_areas: selectedAreas.length > 0 ? selectedAreas : null,
        training_focus: session.training_focus,
        is_game_speed: session.is_game_speed,
      });

      if (insertError) throw insertError;

      const { error: deleteError } = await supabase
        .from('daily_sessions')
        .delete()
        .eq('id', session.id);

      if (deleteError) {
        console.error('Error removing old session after edit:', deleteError);
        Alert.alert(
          'Partial Update',
          'The corrected session was saved, but the old one could not be removed. Contact support.',
        );
      }

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error editing session:', error);
      Alert.alert('Error', 'Failed to save changes. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const touchCount = touches ? parseInt(touches) : 0;
  const juggleCount = juggles ? parseInt(juggles) : 0;
  const isFormValid = DATE_RE.test(date) && (touchCount > 0 || juggleCount > 0);

  return (
    <Modal
      visible={visible}
      animationType='slide'
      transparent={true}
      onRequestClose={onClose}
      statusBarTranslucent={Platform.OS === 'android'}
      hardwareAccelerated
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Edit Session</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name='close' size={28} color='#1a1a2e' />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.modalBody}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps='handled'
            contentContainerStyle={styles.scrollContent}
          >
            {/* Date */}
            <Text style={styles.sectionLabel}>Date</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder='YYYY-MM-DD'
                placeholderTextColor='#B0BEC5'
                value={date}
                onChangeText={setDate}
                maxLength={10}
              />
              <View style={styles.inputIconBg}>
                <Ionicons name='calendar' size={20} color='#1f89ee' />
              </View>
            </View>
            <View style={styles.pillsRow}>
              {[
                { label: 'Today', value: today },
                { label: 'Yesterday', value: yesterday },
                { label: '2 Days Ago', value: twoDaysAgo },
              ].map((quick) => (
                <TouchableOpacity
                  key={quick.value}
                  style={[styles.pill, date === quick.value && styles.pillActive]}
                  onPress={() => setDate(quick.value)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.pillText, date === quick.value && styles.pillTextActive]}>
                    {quick.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Touches + Duration */}
            <View style={styles.inputPairRow}>
              <View style={styles.inputPairHalf}>
                <Text style={styles.sectionLabel}>Touches</Text>
                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.input}
                    placeholder='0'
                    placeholderTextColor='#B0BEC5'
                    keyboardType='number-pad'
                    returnKeyType='done'
                    maxLength={5}
                    value={touches}
                    onChangeText={setTouches}
                  />
                  <View style={styles.inputIconBg}>
                    <Ionicons name='football' size={20} color='#1f89ee' />
                  </View>
                </View>
              </View>
              <View style={styles.inputPairHalf}>
                <Text style={styles.sectionLabel}>Minutes</Text>
                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.input}
                    placeholder='0'
                    placeholderTextColor='#B0BEC5'
                    keyboardType='number-pad'
                    returnKeyType='done'
                    value={duration}
                    onChangeText={setDuration}
                  />
                  <View style={styles.inputIconBg}>
                    <Ionicons name='time' size={20} color='#FF9800' />
                  </View>
                </View>
              </View>
            </View>

            {/* Focus areas */}
            <Text style={styles.sectionLabel}>
              What did they work on? <Text style={styles.optionalLabel}>(optional)</Text>
            </Text>
            <View style={styles.pillsRow}>
              {FOCUS_AREAS.map((area) => {
                const active = selectedAreas.includes(area.key);
                return (
                  <TouchableOpacity
                    key={area.key}
                    style={[styles.pill, active && styles.pillActive]}
                    onPress={() =>
                      setSelectedAreas((prev) =>
                        active ? prev.filter((k) => k !== area.key) : [...prev, area.key],
                      )
                    }
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.pillText, active && styles.pillTextActive]}>{area.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Best Juggles */}
            <Text style={styles.sectionLabel}>
              Best Juggles <Text style={styles.optionalLabel}>(optional)</Text>
            </Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder='0'
                placeholderTextColor='#B0BEC5'
                keyboardType='number-pad'
                returnKeyType='done'
                maxLength={5}
                value={juggles}
                onChangeText={setJuggles}
              />
              <View style={styles.inputIconBg}>
                <Ionicons name='trophy' size={20} color='#FFD700' />
              </View>
            </View>

            <View style={{ height: 20 }} />
          </ScrollView>

          <View style={[styles.buttonContainer, { paddingBottom: Math.max(30, bottomInset + 20) }]}>
            <TouchableOpacity
              style={[styles.submitButton, !isFormValid && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={!isFormValid || submitting}
            >
              {submitting ? (
                <ActivityIndicator size='small' color='#FFF' />
              ) : (
                <Text style={styles.submitButtonText}>SAVE CHANGES</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default EditSessionModal;

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: screenHeight * 0.85,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F7FA',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#1a1a2e',
  },
  closeButton: {
    padding: 4,
  },
  modalBody: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  sectionLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1a1a2e',
    marginBottom: 8,
  },
  optionalLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#78909C',
  },
  inputContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  input: {
    backgroundColor: '#F0F2F5',
    borderRadius: 12,
    padding: 16,
    paddingRight: 50,
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a2e',
    borderWidth: 2,
    borderColor: '#DDE1E7',
  },
  inputIconBg: {
    position: 'absolute',
    right: 16,
    top: '50%',
    transform: [{ translateY: -16 }],
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputPairRow: {
    flexDirection: 'row',
    gap: 12,
  },
  inputPairHalf: {
    flex: 1,
  },
  pillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#F0F2F5',
    borderWidth: 1.5,
    borderColor: '#DDE1E7',
  },
  pillActive: {
    backgroundColor: '#EFF6FF',
    borderColor: '#1f89ee',
  },
  pillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#78909C',
  },
  pillTextActive: {
    color: '#1f89ee',
  },
  buttonContainer: {
    backgroundColor: '#FFF',
    padding: 20,
    paddingBottom: 30,
    borderTopWidth: 1,
    borderTopColor: '#F5F7FA',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButton: {
    backgroundColor: '#ffb724',
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#ffb724',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  submitButtonDisabled: {
    backgroundColor: '#B0BEC5',
    shadowOpacity: 0,
  },
  submitButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
});
