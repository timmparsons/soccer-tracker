import { checkAndAwardBadges, BadgeCheckContext } from '@/lib/checkBadges';
import { scheduleInactivityReminders } from '@/lib/notifications';
import { supabase } from '@/lib/supabase';
import { getLocalDate } from '@/utils/getLocalDate';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Keyboard,
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
    earnedBadgeIds?: string[],
  ) => void;
  challengeDrillId?: string;
  challengeDurationMinutes?: number;
  challengeName?: string;
  challengeDifficulty?: string;
  badgeContext?: Omit<BadgeCheckContext, 'jugglesThisSession' | 'durationMinutes'>;
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
  badgeContext,
}: LogSessionModalProps) => {
  const [touches, setTouches] = useState('');
  const [duration, setDuration] = useState('');
  const [juggles, setJuggles] = useState('');
  const [attempted, setAttempted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [matchSpeed, setMatchSpeed] = useState(true);
  const [vinnieConfirmVisible, setVinnieConfirmVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const show = Keyboard.addListener('keyboardDidShow', (e) => {
      setKeyboardHeight(e.endCoordinates.height);
    });
    const hide = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardHeight(0);
    });
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  useEffect(() => {
    if (visible) {
      setDuration(
        challengeDurationMinutes ? String(challengeDurationMinutes) : '',
      );
      setAttempted(false);
      setTouches('');
      setMatchSpeed(true);
    }
  }, [visible, challengeDurationMinutes]);

  const isChallengeMode = !!challengeDrillId;

  const doSubmit = async (resolvedMatchSpeed: boolean) => {
    const touchCount = touches ? parseInt(touches) : 0;
    const juggleCount = juggles ? parseInt(juggles) : 0;

    setSubmitting(true);

    try {
      const today = getLocalDate();

      const { error } = await supabase.from('daily_sessions').insert({
        user_id: userId,
        drill_id: challengeDrillId ?? null,
        touches_logged: touchCount > 0 ? touchCount : juggleCount,
        duration_minutes: duration ? parseInt(duration) : null,
        juggle_count: juggleCount > 0 ? juggleCount : null,
        is_match_speed: isChallengeMode ? true : resolvedMatchSpeed,
        date: today,
      });

      if (error) throw error;

      scheduleInactivityReminders(new Date()).catch(() => {});

      let earnedBadgeIds: string[] = [];
      if (badgeContext) {
        const durationMinutes = duration ? parseInt(duration) : null;
        earnedBadgeIds = await checkAndAwardBadges(userId, {
          ...badgeContext,
          jugglesThisSession: juggleCount > 0 ? juggleCount : null,
          durationMinutes,
        });
      }

      setTouches('');
      setDuration('');
      setJuggles('');
      setAttempted(false);
      setMatchSpeed(true);

      onSuccess();
      onClose();
      onSessionLogged?.(
        touchCount || juggleCount,
        isChallengeMode,
        challengeName,
        earnedBadgeIds,
      );
    } catch (error) {
      console.error('Error logging session:', error);
      Alert.alert('Error', 'Failed to log session. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async () => {
    const touchCount = touches ? parseInt(touches) : 0;
    const juggleCount = juggles ? parseInt(juggles) : 0;

    if (isChallengeMode) {
      if (!attempted) {
        Alert.alert('Did you attempt it?', 'Check the box to confirm you attempted this challenge');
        return;
      }
    } else if (touchCount <= 0 && juggleCount <= 0) {
      Alert.alert('Invalid Input', 'Please enter touches or a juggling record');
      return;
    }

    if (!isChallengeMode && matchSpeed) {
      setVinnieConfirmVisible(true);
      return;
    }

    await doSubmit(matchSpeed);
  };

  // Check if form is valid
  const touchCount = touches ? parseInt(touches) : 0;
  const juggleCount = juggles ? parseInt(juggles) : 0;
  const isFormValid = isChallengeMode
    ? attempted
    : touchCount > 0 || juggleCount > 0;

  return (
    <Modal
      visible={visible}
      animationType='slide'
      transparent={true}
      onRequestClose={onClose}
      statusBarTranslucent={Platform.OS === 'android'}
      hardwareAccelerated
    >
      <View style={styles.kavContainer}>
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContent,
              keyboardHeight > 0 && { height: screenHeight * 0.85 - keyboardHeight },
            ]}
          >
          {/* Vinnie match speed confirmation overlay */}
          {vinnieConfirmVisible && (
            <View style={styles.vinnieOverlay}>
              <View style={styles.vinnieConfirmCard}>
                <Image
                  source={require('@/assets/images/vinnie.png')}
                  style={styles.vinnieConfirmImage}
                  resizeMode='contain'
                />
                <Text style={styles.vinnieConfirmTitle}>Hold on...</Text>
                <Text style={styles.vinnieConfirmBody}>
                  Did you really go{' '}
                  <Text style={styles.vinnieConfirmBold}>full match speed</Text>? Moving dynamically, dropping hips, exploding out of turns?
                </Text>
                <Text style={styles.vinnieConfirmSub}>
                  Be honest — your squad sees this on the leaderboard.
                </Text>
                <TouchableOpacity
                  style={styles.vinnieConfirmYes}
                  onPress={() => {
                    setVinnieConfirmVisible(false);
                    doSubmit(true);
                  }}
                >
                  <Text style={styles.vinnieConfirmYesText}>Yes, full gas! 🔥</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.vinnieConfirmNo}
                  onPress={() => {
                    setVinnieConfirmVisible(false);
                    doSubmit(false);
                  }}
                >
                  <Text style={styles.vinnieConfirmNoText}>Nah, just warming up</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Log Practice Session</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name='close' size={28} color='#1a1a2e' />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.modalBody}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps='handled'
            contentContainerStyle={styles.scrollContent}
            automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
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

            {/* Attempted checkbox — challenge mode only */}
            {isChallengeMode && (
              <TouchableOpacity
                style={styles.attemptedRow}
                onPress={() => setAttempted((prev) => !prev)}
                activeOpacity={0.7}
              >
                <View style={[styles.checkbox, attempted && styles.checkboxChecked]}>
                  {attempted && <Ionicons name='checkmark' size={14} color='#FFF' />}
                </View>
                <Text style={styles.attemptedLabel}>I attempted this challenge</Text>
              </TouchableOpacity>
            )}

            {/* Match Speed Toggle — regular mode only */}
            {!isChallengeMode && (
              <View style={styles.intensitySection}>
                <Text style={styles.sectionLabel}>Training Intensity</Text>
                <View style={styles.intensityToggle}>
                  <TouchableOpacity
                    style={[styles.intensityOption, !matchSpeed && styles.intensityOptionActiveWarm]}
                    onPress={() => setMatchSpeed(false)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.intensityOptionText, !matchSpeed && styles.intensityOptionTextActiveWarm]}>
                      Warm Up
                    </Text>
                    <Text style={styles.intensityOptionSub}>Half points on leaderboard</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.intensityOption, matchSpeed && styles.intensityOptionActiveMatch]}
                    onPress={() => setMatchSpeed(true)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.intensityOptionText, matchSpeed && styles.intensityOptionTextActiveMatch]}>
                      Match Speed 🔥
                    </Text>
                    <Text style={[styles.intensityOptionSub, matchSpeed && { color: 'rgba(255,255,255,0.75)' }]}>Full points on leaderboard</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Touches + Duration — side by side so both are always visible when keyboard is open */}
            <View style={styles.inputPairSection}>
              <View style={styles.inputPairRow}>
                {/* Left: Touches / Score */}
                <View style={styles.inputPairHalf}>
                  <Text style={styles.sectionLabel}>
                    {isChallengeMode ? (
                      <>Score / Reps <Text style={styles.optionalLabel}>(optional)</Text></>
                    ) : 'Touches'}
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
                      />
                    <View style={styles.inputIconBg}>
                      {isChallengeMode ? (
                        <Ionicons name='trophy' size={20} color='#ffb724' />
                      ) : (
                        <Ionicons name='football' size={20} color='#1f89ee' />
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
                    />
                    <View style={styles.inputIconBg}>
                      <Ionicons name='time' size={20} color='#FF9800' />
                    </View>
                  </View>
                </View>
              </View>

              {/* Hint */}
              {isChallengeMode ? (
                <Text style={styles.sectionHint}>Score is optional — logging the attempt still counts!</Text>
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

            {/* Best Juggles — simple optional field, regular mode only */}
            {!isChallengeMode && (
              <View style={styles.jugglingInputSection}>
                <Text style={styles.sectionLabel}>
                  Best Juggles{' '}
                  <Text style={styles.optionalLabel}>(optional)</Text>
                </Text>
                <Text style={styles.jugglingHint}>Juggling only? Enter your juggle count here — it'll count as your touches too.</Text>
                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.input}
                    placeholder='0'
                    placeholderTextColor='#B0BEC5'
                    keyboardType='number-pad'
                    returnKeyType='done'
                    value={juggles}
                    onChangeText={setJuggles}
                  />
                  <View style={styles.inputIconBg}>
                    <Ionicons name='trophy' size={20} color='#FFD700' />
                  </View>
                </View>
              </View>
            )}

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
                    ? touchCount > 0
                      ? `LOG CHALLENGE • ${touchCount.toLocaleString()}`
                      : 'LOG ATTEMPT'
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
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default LogSessionModal;

const styles = StyleSheet.create({
  kavContainer: {
    flex: 1,
  },
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
  section: {
    marginBottom: 24,
  },
  jugglingInputSection: {
    marginBottom: 24,
  },
  jugglingHint: {
    fontSize: 12,
    fontWeight: '600',
    color: '#78909C',
    marginBottom: 10,
  },
  optionalLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#78909C',
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
    paddingVertical: 1,
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
    color: '#ffb724',
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
  attemptedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: '#F0FDF4',
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#D1FAE5',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#31af4d',
    borderColor: '#31af4d',
  },
  attemptedLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1a1a2e',
    flex: 1,
  },
  challengeLabel: {
    backgroundColor: '#E8F5E9',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#31af4d',
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
  intensitySection: {
    marginBottom: 24,
  },
  intensityToggle: {
    flexDirection: 'row',
    backgroundColor: '#F0F2F5',
    borderRadius: 14,
    padding: 4,
    gap: 4,
  },
  intensityOption: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 10,
    alignItems: 'center',
  },
  intensityOptionActiveWarm: {
    backgroundColor: '#FFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  intensityOptionActiveMatch: {
    backgroundColor: '#ffb724',
    shadowColor: '#ffb724',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  intensityOptionText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#78909C',
    marginBottom: 2,
  },
  intensityOptionTextActiveWarm: {
    color: '#1a1a2e',
  },
  intensityOptionTextActiveMatch: {
    color: '#FFF',
  },
  intensityOptionSub: {
    fontSize: 11,
    fontWeight: '600',
    color: '#B0BEC5',
  },
  vinnieOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    borderRadius: 24,
    zIndex: 10,
  },
  vinnieConfirmCard: {
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    width: '100%',
  },
  vinnieConfirmImage: {
    width: 100,
    height: 70,
    marginBottom: 12,
  },
  vinnieConfirmTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#1a1a2e',
    marginBottom: 10,
  },
  vinnieConfirmBody: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1a1a2e',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 8,
  },
  vinnieConfirmBold: {
    fontWeight: '900',
    color: '#ffb724',
  },
  vinnieConfirmSub: {
    fontSize: 13,
    fontWeight: '600',
    color: '#78909C',
    textAlign: 'center',
    marginBottom: 24,
  },
  vinnieConfirmYes: {
    backgroundColor: '#ffb724',
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 32,
    width: '100%',
    alignItems: 'center',
    marginBottom: 10,
  },
  vinnieConfirmYesText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '900',
  },
  vinnieConfirmNo: {
    paddingVertical: 12,
    width: '100%',
    alignItems: 'center',
  },
  vinnieConfirmNoText: {
    color: '#78909C',
    fontSize: 15,
    fontWeight: '700',
  },
  minutesLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },

});
