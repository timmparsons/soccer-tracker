import { useDrills } from '@/hooks/useTouchTracking';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

const screenHeight = Dimensions.get('window').height;

interface LogSessionModalProps {
  visible: boolean;
  onClose: () => void;
  userId: string;
  onSuccess: () => void;
}

const LogSessionModal = ({
  visible,
  onClose,
  userId,
  onSuccess,
}: LogSessionModalProps) => {
  const [touches, setTouches] = useState('');
  const [duration, setDuration] = useState('');
  const [juggles, setJuggles] = useState('');
  const [selectedDrillId, setSelectedDrillId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const { data: drills, isLoading: drillsLoading } = useDrills();

  // Helper to get local date in YYYY-MM-DD format
  const getLocalDate = (): string => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const handleSubmit = async () => {
    const touchCount = parseInt(touches);
    if (!touchCount || touchCount <= 0) {
      Alert.alert('Invalid Input', 'Please enter a valid number of touches');
      return;
    }

    setSubmitting(true);

    try {
      const today = getLocalDate();

      const { error } = await supabase.from('daily_sessions').insert({
        user_id: userId,
        drill_id: selectedDrillId,
        touches_logged: touchCount,
        duration_minutes: duration ? parseInt(duration) : null,
        date: today,
      });

      if (error) throw error;

      // Reset form
      setTouches('');
      setDuration('');
      setJuggles('');
      setSelectedDrillId(null);

      Alert.alert(
        'Success!',
        `Logged ${touchCount.toLocaleString()} touches! 🎉`
      );
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error logging session:', error);
      Alert.alert('Error', 'Failed to log session. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const getDifficultyIcon = (level: string) => {
    switch (level) {
      case 'beginner':
        return '🟢';
      case 'intermediate':
        return '🟡';
      case 'advanced':
        return '🔴';
      default:
        return '⚽';
    }
  };

  const getDifficultyColor = (level: string) => {
    switch (level) {
      case 'beginner':
        return '#4CAF50';
      case 'intermediate':
        return '#FFC107';
      case 'advanced':
        return '#F44336';
      default:
        return '#2B9FFF';
    }
  };

  // Check if form is valid
  const isFormValid = touches && parseInt(touches) > 0;

  return (
    <Modal
      visible={visible}
      animationType='slide'
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <View style={styles.modalContent}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Log Practice Session</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Ionicons name='close' size={28} color='#1a1a2e' />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.modalBody}
              showsVerticalScrollIndicator={false}
            >
              {/* Touches Input */}
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>
                  How many touches? <Text style={styles.required}>*</Text>
                </Text>
                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.input}
                    placeholder='Enter number of touches'
                    placeholderTextColor='#B0BEC5'
                    keyboardType='number-pad'
                    value={touches}
                    onChangeText={setTouches}
                    autoFocus={true}
                  />
                  <View style={styles.inputIconBg}>
                    <Ionicons name='football' size={20} color='#2B9FFF' />
                  </View>
                </View>
              </View>

              {/* Juggling Record */}
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>
                  Juggling record (optional)
                </Text>
                <Text style={styles.sectionHint}>
                  Did you set a new personal best?
                </Text>
                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.input}
                    placeholder='Consecutive juggles'
                    placeholderTextColor='#B0BEC5'
                    keyboardType='number-pad'
                    value={juggles}
                    onChangeText={setJuggles}
                  />
                  <View style={styles.inputIconBg}>
                    <Ionicons name='trophy' size={20} color='#FFD700' />
                  </View>
                </View>
              </View>

              {/* Duration Input (Optional) */}
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>How long? (optional)</Text>
                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.input}
                    placeholder='Minutes'
                    placeholderTextColor='#B0BEC5'
                    keyboardType='number-pad'
                    value={duration}
                    onChangeText={setDuration}
                  />
                  <View style={styles.inputIconBg}>
                    <Ionicons name='time' size={20} color='#42A5F5' />
                  </View>
                </View>
              </View>

              {/* Drill Selection */}
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>
                  What did you practice? (optional)
                </Text>
                <Text style={styles.sectionHint}>
                  Choose a drill or select &quot;Free Practice&quot;
                </Text>

                {drillsLoading ? (
                  <ActivityIndicator
                    size='small'
                    color='#2B9FFF'
                    style={styles.loader}
                  />
                ) : (
                  <>
                    <TouchableOpacity
                      style={[
                        styles.drillOption,
                        selectedDrillId === null && styles.drillOptionSelected,
                      ]}
                      onPress={() => setSelectedDrillId(null)}
                    >
                      <View style={styles.drillOptionContent}>
                        <View style={styles.drillIconCircle}>
                          <Ionicons name='football' size={24} color='#2B9FFF' />
                        </View>
                        <Text
                          style={[
                            styles.drillOptionText,
                            selectedDrillId === null &&
                              styles.drillOptionTextSelected,
                          ]}
                        >
                          Free Practice
                        </Text>
                      </View>
                      {selectedDrillId === null && (
                        <Ionicons
                          name='checkmark-circle'
                          size={24}
                          color='#2B9FFF'
                        />
                      )}
                    </TouchableOpacity>

                    {drills?.map((drill) => (
                      <TouchableOpacity
                        key={drill.id}
                        style={[
                          styles.drillOption,
                          selectedDrillId === drill.id &&
                            styles.drillOptionSelected,
                        ]}
                        onPress={() => setSelectedDrillId(drill.id)}
                      >
                        <View style={styles.drillOptionContent}>
                          <View
                            style={[
                              styles.drillIconCircle,
                              {
                                backgroundColor: `${getDifficultyColor(
                                  drill.difficulty_level
                                )}15`,
                              },
                            ]}
                          >
                            <Text style={styles.difficultyEmoji}>
                              {getDifficultyIcon(drill.difficulty_level)}
                            </Text>
                          </View>
                          <View style={styles.drillTextContainer}>
                            <Text
                              style={[
                                styles.drillOptionText,
                                selectedDrillId === drill.id &&
                                  styles.drillOptionTextSelected,
                              ]}
                            >
                              {drill.name}
                            </Text>
                            <Text style={styles.drillTargetText}>
                              Target: {drill.target_touches} touches •{' '}
                              {drill.target_duration_seconds}s
                            </Text>
                          </View>
                        </View>
                        {selectedDrillId === drill.id && (
                          <Ionicons
                            name='checkmark-circle'
                            size={24}
                            color='#2B9FFF'
                          />
                        )}
                      </TouchableOpacity>
                    ))}
                  </>
                )}
              </View>

              {/* Bottom padding for scrolling */}
              <View style={{ height: 120 }} />
            </ScrollView>

            {/* Submit Button - Fixed at bottom */}
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[
                  styles.submitButton,
                  !isFormValid && styles.submitButtonDisabled,
                ]}
                onPress={handleSubmit}
                disabled={!isFormValid || submitting}
              >
                {submitting ? (
                  <ActivityIndicator size='small' color='#FFF' />
                ) : (
                  <Text style={styles.submitButtonText}>
                    LOG SESSION{' '}
                    {touches &&
                      `• ${parseInt(touches).toLocaleString()} TOUCHES`}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

export default LogSessionModal;

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  keyboardView: {
    maxHeight: screenHeight * 0.9,
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: screenHeight * 0.9,
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
  section: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1a1a2e',
    marginBottom: 8,
  },
  required: {
    color: '#FF7043',
  },
  sectionHint: {
    fontSize: 13,
    fontWeight: '600',
    color: '#78909C',
    marginBottom: 12,
  },
  loader: {
    marginVertical: 20,
  },
  inputContainer: {
    position: 'relative',
  },
  input: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    paddingRight: 50,
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a2e',
    borderWidth: 2,
    borderColor: 'transparent',
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
  drillOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  drillOptionSelected: {
    backgroundColor: '#E8EAF6',
    borderColor: '#2B9FFF',
  },
  drillOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  drillIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E8EAF6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  difficultyEmoji: {
    fontSize: 20,
  },
  drillTextContainer: {
    flex: 1,
  },
  drillOptionText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a2e',
  },
  drillOptionTextSelected: {
    color: '#2B9FFF',
  },
  drillTargetText: {
    fontSize: 12,
    color: '#78909C',
    fontWeight: '600',
    marginTop: 2,
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
    backgroundColor: '#FF7043',
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#FF7043',
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
