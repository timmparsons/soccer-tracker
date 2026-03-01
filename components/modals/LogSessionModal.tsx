import { useJugglingRecord } from '@/hooks/useTouchTracking';
import { scheduleInactivityReminders } from '@/lib/notifications';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
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
  onSessionLogged?: (
    touchCount: number,
    isChallenge: boolean,
    drillName?: string,
  ) => void;
  challengeDrillId?: string;
  challengeDurationMinutes?: number;
  challengeName?: string;
  challengeDifficulty?: string;
}

const DRILL_TIPS: Record<string, string> = {
  beginner:
    'Focus on clean touches, not speed. Get comfortable with the ball first! ⚽',
  intermediate: 'Keep your head up and work both feet. Consistency is key! 💪',
  advanced:
    'Game speed every rep. No breaks — this is where champions are made! 🔥',
};

const LogSessionModal = ({
  visible,
  onClose,
  userId,
  onSuccess,
  onSessionLogged,
  challengeDrillId,
  challengeDurationMinutes,
  challengeName,
  challengeDifficulty,
}: LogSessionModalProps) => {
  const [touches, setTouches] = useState('');
  const [duration, setDuration] = useState('');
  const [juggles, setJuggles] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (visible) {
      setDuration(
        challengeDurationMinutes ? String(challengeDurationMinutes) : '',
      );
    }
  }, [visible, challengeDurationMinutes]);
  const scrollViewRef = useRef<ScrollView>(null);

  const { data: currentRecord } = useJugglingRecord(userId);

  // Helper to get local date in YYYY-MM-DD format
  const getLocalDate = (): string => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const isChallengeMode = !!challengeDrillId;

  const handleSubmit = async () => {
    const touchCount = touches ? parseInt(touches) : 0;
    const juggleCount = juggles ? parseInt(juggles) : 0;

    if (isChallengeMode) {
      if (touchCount <= 0) {
        Alert.alert('Invalid Input', 'Please enter your score or rep count');
        return;
      }
    } else if (touchCount <= 0 && juggleCount <= 0) {
      Alert.alert('Invalid Input', 'Please enter touches or a juggling record');
      return;
    }

    setSubmitting(true);

    try {
      const today = getLocalDate();

      const { error } = await supabase.from('daily_sessions').insert({
        user_id: userId,
        drill_id: challengeDrillId ?? null,
        touches_logged: touchCount,
        duration_minutes: duration ? parseInt(duration) : null,
        juggle_count: juggleCount > 0 ? juggleCount : null,
        date: today,
      });

      if (error) throw error;

      // Reschedule inactivity reminders — reset the 2-day countdown from now
      scheduleInactivityReminders(new Date());

      // Reset form
      setTouches('');
      setDuration('');
      setJuggles('');

      onSuccess();
      onClose();
      onSessionLogged?.(
        touchCount || juggleCount,
        isChallengeMode,
        challengeName,
      );
    } catch (error) {
      console.error('Error logging session:', error);
      Alert.alert('Error', 'Failed to log session. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Check if form is valid
  const touchCount = touches ? parseInt(touches) : 0;
  const juggleCount = juggles ? parseInt(juggles) : 0;
  const isFormValid = isChallengeMode
    ? touchCount > 0
    : touchCount > 0 || juggleCount > 0;

  return (
    <Modal
      visible={visible}
      animationType='slide'
      transparent={true}
      onRequestClose={onClose}
      statusBarTranslucent={Platform.OS === 'android'}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header - stays fixed; NOT inside KeyboardAvoidingView so it never scrolls off screen */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Log Practice Session</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name='close' size={28} color='#1a1a2e' />
            </TouchableOpacity>
          </View>

          {/* Only the body + submit button respond to the keyboard */}
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.keyboardAvoidingBody}
          >
          <ScrollView
            ref={scrollViewRef}
            style={styles.modalBody}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps='handled'
            contentContainerStyle={styles.scrollContent}
          >
            {/* Challenge label */}
            {challengeName && (
              <View style={styles.challengeLabel}>
                <Text style={styles.challengeLabelText}>
                  Challenge: {challengeName}
                </Text>
              </View>
            )}

            {/* Vinnie coaching tip - challenge mode only */}
            {isChallengeMode &&
              challengeDifficulty &&
              DRILL_TIPS[challengeDifficulty] && (
                <View style={styles.vinnieTipRow}>
                  <Image
                    source={require('@/assets/images/vinnie.png')}
                    style={styles.vinnieTipImage}
                    resizeMode='contain'
                  />
                  <View style={styles.vinnieTipBubbleRow}>
                    <View style={styles.vinnieTipTail} />
                    <View style={styles.vinnieTipBubble}>
                      <Text style={styles.vinnieTipText}>
                        {DRILL_TIPS[challengeDifficulty]} — Coach Vinnie
                      </Text>
                    </View>
                  </View>
                </View>
              )}

            {/* Juggling Record - Regular mode only */}
            {!isChallengeMode && (
              <View style={styles.jugglingSection}>
                <View style={styles.jugglingSectionHeader}>
                  <Text style={styles.jugglingEmoji}>🏆</Text>
                  <View style={styles.jugglingTitleContainer}>
                    <Text style={styles.jugglingTitle}>Juggling Record</Text>
                    {currentRecord !== undefined && currentRecord > 0 && (
                      <Text style={styles.jugglingCurrentRecord}>
                        Current PR: {currentRecord}
                      </Text>
                    )}
                  </View>
                </View>
                <Text style={styles.jugglingHint}>
                  {currentRecord !== undefined && currentRecord > 0
                    ? `Beat your record of ${currentRecord}!`
                    : 'How many consecutive juggles can you do?'}
                </Text>
                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.jugglingInput}
                    placeholder='Enter your best juggles'
                    placeholderTextColor='#B8860B'
                    keyboardType='number-pad'
                    value={juggles}
                    onChangeText={setJuggles}
                  />
                  <View style={styles.inputIconBgGold}>
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
            )}

            {/* Touches + Duration — side by side so both are always visible when keyboard is open */}
            <View style={styles.inputPairSection}>
              <View style={styles.inputPairRow}>
                {/* Left: Touches / Score */}
                <View style={styles.inputPairHalf}>
                  <Text style={styles.sectionLabel}>
                    {isChallengeMode ? 'Score / Reps' : 'Touches'}
                  </Text>
                  <View style={styles.inputContainer}>
                    <TextInput
                      style={styles.input}
                      placeholder={isChallengeMode ? 'Score' : '0'}
                      placeholderTextColor='#B0BEC5'
                      keyboardType='number-pad'
                      returnKeyType='done'
                      value={touches}
                      onChangeText={setTouches}
                      onFocus={() =>
                        setTimeout(
                          () => scrollViewRef.current?.scrollToEnd({ animated: true }),
                          200,
                        )
                      }
                    />
                    <View style={styles.inputIconBg}>
                      {isChallengeMode ? (
                        <Ionicons name='trophy' size={20} color='#FF7043' />
                      ) : (
                        <Ionicons name='football' size={20} color='#2B9FFF' />
                      )}
                    </View>
                  </View>
                </View>

                {/* Right: Minutes */}
                <View style={styles.inputPairHalf}>
                  <View style={styles.minutesLabelRow}>
                    <Text style={[styles.sectionLabel, { marginBottom: 0 }]}>Minutes</Text>
                    <View style={styles.tpmBadge}>
                      <Ionicons name='flash' size={12} color='#FF9800' />
                      <Text style={styles.tpmBadgeText}>TPM</Text>
                    </View>
                  </View>
                  <View style={styles.inputContainer}>
                    <TextInput
                      style={styles.input}
                      placeholder='0'
                      placeholderTextColor='#B0BEC5'
                      keyboardType='number-pad'
                      returnKeyType='done'
                      value={duration}
                      onChangeText={setDuration}
                      onFocus={() =>
                        setTimeout(
                          () => scrollViewRef.current?.scrollToEnd({ animated: true }),
                          200,
                        )
                      }
                    />
                    <View style={styles.inputIconBg}>
                      <Ionicons name='time' size={20} color='#FF9800' />
                    </View>
                  </View>
                </View>
              </View>

              {/* Hint */}
              {isChallengeMode ? (
                <Text style={styles.sectionHint}>Enter your score or rep count</Text>
              ) : !duration ? (
                <Text style={styles.sectionHint}>Add minutes to track your touches per minute!</Text>
              ) : null}

              {/* TPM preview */}
              {!isChallengeMode &&
                touches &&
                duration &&
                parseInt(duration) > 0 && (
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
                  {isChallengeMode
                    ? 'LOG CHALLENGE'
                    : touchCount > 0 && juggleCount > 0
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
          </KeyboardAvoidingView>
        </View>
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
  modalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: screenHeight * 0.75,
    maxHeight: screenHeight * 0.9,
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
  keyboardAvoidingBody: {
    flex: 1,
  },
  modalBody: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  section: {
    marginBottom: 24,
  },
  jugglingSection: {
    marginBottom: 24,
    backgroundColor: '#FFF8DC',
    padding: 20,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: '#FFD700',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  jugglingSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 12,
  },
  jugglingEmoji: {
    fontSize: 36,
  },
  jugglingTitleContainer: {
    flex: 1,
  },
  jugglingTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#B8860B',
  },
  jugglingCurrentRecord: {
    fontSize: 14,
    fontWeight: '700',
    color: '#DAA520',
    marginTop: 2,
  },
  jugglingHint: {
    fontSize: 14,
    fontWeight: '600',
    color: '#B8860B',
    marginBottom: 14,
  },
  jugglingInput: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    paddingRight: 50,
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a2e',
    borderWidth: 2,
    borderColor: '#FFD700',
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
  inputIconBgGold: {
    position: 'absolute',
    right: 16,
    top: '50%',
    transform: [{ translateY: -16 }],
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFF9E6',
    justifyContent: 'center',
    alignItems: 'center',
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
  challengeLabel: {
    backgroundColor: '#E8F5E9',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#10B981',
  },
  challengeLabelText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#388E3C',
  },
  vinnieTipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  vinnieTipImage: {
    width: 80,
    height: 52,
    flexShrink: 0,
  },
  vinnieTipBubbleRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  vinnieTipTail: {
    width: 0,
    height: 0,
    borderTopWidth: 7,
    borderBottomWidth: 7,
    borderRightWidth: 10,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderRightColor: '#E8E8E8',
  },
  vinnieTipBubble: {
    flex: 1,
    backgroundColor: '#E8E8E8',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  vinnieTipText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1a1a2e',
    lineHeight: 19,
  },
  inputPairSection: {
    marginBottom: 24,
  },
  inputPairRow: {
    flexDirection: 'row',
    gap: 12,
  },
  inputPairHalf: {
    flex: 1,
  },
  minutesLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
});
