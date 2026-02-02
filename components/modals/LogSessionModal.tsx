import { useDrills, useJugglingRecord } from '@/hooks/useTouchTracking';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import React, { useRef, useState } from 'react';
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

// Drill descriptions for users who may not know the terms
const DRILL_DESCRIPTIONS: Record<string, string> = {
  // Beginner
  'Toe Taps': 'Alternating taps on top of the ball with the sole of each foot',
  'Inside-Outside Taps':
    'Tap the ball side to side using inside and outside of the same foot',
  'Sole Rolls': 'Roll the ball side to side under your foot using your sole',
  'Foundation Touches':
    'Basic ball control - taps, rolls, and touches with all parts of the foot',
  // Intermediate
  'Around the World': 'Circle your foot around the ball while juggling',
  'Thigh Catches': 'Cushion the ball on your thigh and control it back down',
  'Pull-Push':
    'Pull the ball back with your sole, then push it forward with your laces',
  'La Croqueta':
    'Quick side-to-side touch between feet, made famous by Iniesta',
  // Advanced
  'Cruyff Turn': 'Fake a pass then drag the ball behind your standing leg',
  Elastico:
    'Push the ball outside then quickly snap it back inside with the same foot',
  'Maradona Spin': 'Drag the ball with one foot while spinning 360° over it',
};

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
  const scrollViewRef = useRef<ScrollView>(null);

  const { data: drills, isLoading: drillsLoading } = useDrills();
  const { data: currentRecord } = useJugglingRecord(userId);

  // Helper to get local date in YYYY-MM-DD format
  const getLocalDate = (): string => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const handleSubmit = async () => {
    const touchCount = touches ? parseInt(touches) : 0;
    const juggleCount = juggles ? parseInt(juggles) : 0;

    // Must have either touches or juggles
    if (touchCount <= 0 && juggleCount <= 0) {
      Alert.alert('Invalid Input', 'Please enter touches or a juggling record');
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
        juggle_count: juggleCount > 0 ? juggleCount : null,
        date: today,
      });

      if (error) throw error;

      // Reset form
      setTouches('');
      setDuration('');
      setJuggles('');
      setSelectedDrillId(null);

      // Build success message
      let successMsg = '';
      if (touchCount > 0 && juggleCount > 0) {
        successMsg = `Logged ${touchCount.toLocaleString()} touches and ${juggleCount} juggles! 🎉`;
      } else if (touchCount > 0) {
        successMsg = `Logged ${touchCount.toLocaleString()} touches! 🎉`;
      } else {
        successMsg = `Logged juggling record of ${juggleCount}! 🏆`;
      }

      Alert.alert('Success!', successMsg);
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

  // Check if form is valid - allow either touches OR juggles
  const touchCount = touches ? parseInt(touches) : 0;
  const juggleCount = juggles ? parseInt(juggles) : 0;
  const isFormValid = touchCount > 0 || juggleCount > 0;

  return (
    <Modal
      visible={visible}
      animationType='slide'
      transparent={true}
      onRequestClose={onClose}
      statusBarTranslucent={Platform.OS === 'android'}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.modalOverlay}
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
            ref={scrollViewRef}
            style={styles.modalBody}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps='handled'
            contentContainerStyle={styles.scrollContent}
          >
            {/* Touches Input */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>How many touches?</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  placeholder='Enter number of touches'
                  placeholderTextColor='#B0BEC5'
                  keyboardType='number-pad'
                  value={touches}
                  onChangeText={setTouches}
                  onFocus={() => {
                    if (Platform.OS === 'android') {
                      setTimeout(() => {
                        scrollViewRef.current?.scrollTo({
                          y: 0,
                          animated: true,
                        });
                      }, 100);
                    }
                  }}
                />
                <View style={styles.inputIconBg}>
                  <Ionicons name='football' size={20} color='#2B9FFF' />
                </View>
              </View>
            </View>

            {/* Duration Input - Prominent for TPM tracking */}
            <View style={styles.sectionHighlight}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionLabel}>
                  How long did you practice?
                </Text>
                <View style={styles.tpmBadge}>
                  <Ionicons name='flash' size={12} color='#FF9800' />
                  <Text style={styles.tpmBadgeText}>Tracks tempo</Text>
                </View>
              </View>
              <Text style={styles.sectionHint}>
                Add time to see your touches per minute - aim for game speed!
              </Text>
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
                  <Ionicons name='time' size={20} color='#FF9800' />
                </View>
              </View>
              {touches && duration && parseInt(duration) > 0 && (
                <View style={styles.tpmPreview}>
                  <Text style={styles.tpmPreviewText}>
                    ⚡ {Math.round(parseInt(touches) / parseInt(duration))}{' '}
                    touches/min
                    {parseInt(touches) / parseInt(duration) >= 50
                      ? ' - Game speed!'
                      : parseInt(touches) / parseInt(duration) >= 30
                      ? ' - Good pace!'
                      : ' - Try going faster!'}
                  </Text>
                </View>
              )}
            </View>

            {/* Juggling Record */}
            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionLabel}>
                  Juggling record (optional)
                </Text>
                {currentRecord !== undefined && currentRecord > 0 && (
                  <View style={styles.recordBadge}>
                    <Ionicons name='trophy' size={12} color='#FFD700' />
                    <Text style={styles.recordBadgeText}>
                      PR: {currentRecord}
                    </Text>
                  </View>
                )}
              </View>
              <Text style={styles.sectionHint}>
                {currentRecord !== undefined && currentRecord > 0
                  ? `Can you beat ${currentRecord}? Enter your best from this session!`
                  : 'Did you set a new personal best?'}
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
              {juggles &&
                parseInt(juggles) > 0 &&
                currentRecord !== undefined && (
                  <View
                    style={[
                      styles.jugglePreview,
                      parseInt(juggles) > (currentRecord || 0) &&
                        styles.jugglePreviewRecord,
                    ]}
                  >
                    <Text
                      style={[
                        styles.jugglePreviewText,
                        parseInt(juggles) > (currentRecord || 0) &&
                          styles.jugglePreviewTextRecord,
                      ]}
                    >
                      {parseInt(juggles) > (currentRecord || 0)
                        ? '🎉 NEW PERSONAL BEST! +' +
                          (parseInt(juggles) - (currentRecord || 0)) +
                          ' from your record!'
                        : (currentRecord || 0) -
                          parseInt(juggles) +
                          ' away from your PR'}
                    </Text>
                  </View>
                )}
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
                          {DRILL_DESCRIPTIONS[drill.name] && (
                            <Text style={styles.drillDescription}>
                              {DRILL_DESCRIPTIONS[drill.name]}
                            </Text>
                          )}
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
            <View style={{ height: 20 }} />
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
                  {touchCount > 0 && juggleCount > 0
                    ? 'LOG ' +
                      touchCount.toLocaleString() +
                      ' TOUCHES + ' +
                      juggleCount +
                      ' JUGGLES'
                    : touchCount > 0
                    ? 'LOG ' + touchCount.toLocaleString() + ' TOUCHES'
                    : juggleCount > 0
                    ? 'LOG JUGGLING RECORD • ' + juggleCount
                    : 'LOG SESSION'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
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
  modalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: screenHeight * 0.58,
    maxHeight: screenHeight * 0.85,
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
  section: {
    marginBottom: 24,
  },
  sectionHighlight: {
    marginBottom: 24,
    backgroundColor: '#FFF8E1',
    padding: 16,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#FFE082',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  tpmBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  tpmBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FF9800',
  },
  recordBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF9E6',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    gap: 4,
    borderWidth: 1,
    borderColor: '#FFE082',
  },
  recordBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#F9A825',
  },
  jugglePreview: {
    marginTop: 12,
    backgroundColor: '#F5F5F5',
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  jugglePreviewRecord: {
    backgroundColor: '#FFF8E1',
    borderWidth: 1,
    borderColor: '#FFD700',
  },
  jugglePreviewText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#78909C',
  },
  jugglePreviewTextRecord: {
    color: '#F9A825',
    fontWeight: '800',
  },
  tpmPreview: {
    marginTop: 12,
    backgroundColor: '#FFF',
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  tpmPreviewText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FF9800',
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
  drillDescription: {
    fontSize: 12,
    color: '#78909C',
    fontWeight: '500',
    marginTop: 2,
    lineHeight: 16,
  },
  drillTargetText: {
    fontSize: 11,
    color: '#B0BEC5',
    fontWeight: '600',
    marginTop: 4,
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
