import { useSendCoachNote } from '@/hooks/useSendCoachNote';
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const NOTE_MAX_LENGTH = 200;

interface CoachNoteModalProps {
  visible: boolean;
  onClose: () => void;
  playerId: string;
  playerName: string;
  playerPushToken?: string | null;
}

export default function CoachNoteModal({
  visible,
  onClose,
  playerId,
  playerName,
  playerPushToken,
}: CoachNoteModalProps) {
  const insets = useSafeAreaInsets();
  const [message, setMessage] = useState('');
  const { mutate: sendNote, isPending } = useSendCoachNote();

  const handleClose = () => {
    setMessage('');
    onClose();
  };

  const handleSend = () => {
    if (!message.trim() || isPending) return;
    sendNote(
      { playerId, playerPushToken, message: message.trim() },
      {
        onSuccess: () => {
          Alert.alert('Note sent', `${playerName} will get your note as a push notification.`);
          handleClose();
        },
        onError: (err) => {
          Alert.alert('Could not send note', err instanceof Error ? err.message : 'Please try again.');
        },
      },
    );
  };

  return (
    <Modal visible={visible} animationType='slide' presentationStyle='pageSheet' onRequestClose={handleClose}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={[styles.container, { paddingTop: insets.top || 20 }]}>
          <View style={styles.header}>
            <Text style={styles.title}>Note to {playerName}</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
              <Ionicons name='close' size={22} color='#1a1a2e' />
            </TouchableOpacity>
          </View>

          <View style={styles.body}>
            <TextInput
              style={styles.input}
              value={message}
              onChangeText={(t) => setMessage(t.slice(0, NOTE_MAX_LENGTH))}
              placeholder='e.g. Loved the quick feet on those Cruyff turns today'
              placeholderTextColor='#B0BEC5'
              multiline
              autoFocus
              maxLength={NOTE_MAX_LENGTH}
            />
            <Text style={styles.charCount}>{message.length}/{NOTE_MAX_LENGTH}</Text>
          </View>

          <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
            <TouchableOpacity
              style={[styles.sendBtn, (!message.trim() || isPending) && styles.sendBtnDisabled]}
              onPress={handleSend}
              disabled={!message.trim() || isPending}
              activeOpacity={0.8}
            >
              {isPending ? <ActivityIndicator color='#FFF' /> : <Text style={styles.sendBtnText}>Send Note</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: 17,
    fontWeight: '900',
    color: '#1a1a2e',
    flex: 1,
    marginRight: 12,
  },
  closeBtn: {
    padding: 4,
  },
  body: {
    flex: 1,
    padding: 20,
  },
  input: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a2e',
    minHeight: 120,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 12,
    fontWeight: '600',
    color: '#78909C',
    textAlign: 'right',
    marginTop: 8,
  },
  footer: {
    padding: 20,
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  sendBtn: {
    backgroundColor: '#1f89ee',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: '#B0BEC5',
  },
  sendBtnText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FFF',
  },
});
