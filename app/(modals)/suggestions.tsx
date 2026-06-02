import {
  useSuggestions,
  useSubmitSuggestion,
  useToggleVote,
  type Suggestion,
} from '@/hooks/useSuggestions';
import { useUser } from '@/hooks/useUser';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function SuggestionsScreen() {
  const router = useRouter();
  const { data: user } = useUser();
  const { data: suggestions, isLoading } = useSuggestions(user?.id);
  const submitMutation = useSubmitSuggestion(user?.id);
  const voteMutation = useToggleVote(user?.id);

  const [showForm, setShowForm] = useState(false);
  const [input, setInput] = useState('');

  const handleSubmit = async () => {
    const trimmed = input.trim();
    if (trimmed.length < 10) {
      Alert.alert('Too short', 'Give us at least 10 characters to work with.');
      return;
    }
    try {
      await submitMutation.mutateAsync(trimmed);
      setInput('');
      setShowForm(false);
    } catch {
      Alert.alert('Error', 'Failed to submit suggestion. Try again.');
    }
  };

  const handleVote = (suggestion: Suggestion) => {
    if (!user?.id) return;
    voteMutation.mutate({
      suggestionId: suggestion.id,
      hasVoted: suggestion.user_has_voted,
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps='handled'
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
              <Ionicons name='arrow-back' size={24} color='#2C3E50' />
            </TouchableOpacity>
            <View style={styles.headerTitles}>
              <Text style={styles.title}>Suggestions</Text>
              <Text style={styles.subtitle}>
                Vote on ideas or add your own to shape the app
              </Text>
            </View>
          </View>

          {/* Add suggestion */}
          {showForm ? (
            <View style={styles.formCard}>
              <TextInput
                style={styles.textArea}
                placeholder='What would make the app better?'
                placeholderTextColor='#9CA3AF'
                value={input}
                onChangeText={setInput}
                multiline
                maxLength={500}
                autoFocus
              />
              <Text style={styles.charCount}>{input.length}/500</Text>
              <View style={styles.formActions}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => {
                    setShowForm(false);
                    setInput('');
                  }}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.submitButton,
                    submitMutation.isPending && styles.buttonDisabled,
                  ]}
                  onPress={handleSubmit}
                  disabled={submitMutation.isPending}
                >
                  {submitMutation.isPending ? (
                    <ActivityIndicator color='#FFF' size='small' />
                  ) : (
                    <Text style={styles.submitButtonText}>Submit</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => setShowForm(true)}
            >
              <Ionicons name='add-circle-outline' size={20} color='#1f89ee' />
              <Text style={styles.addButtonText}>Add a suggestion</Text>
            </TouchableOpacity>
          )}

          {/* List */}
          {isLoading ? (
            <ActivityIndicator color='#1f89ee' style={styles.loader} />
          ) : !suggestions || suggestions.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name='bulb-outline' size={48} color='#D1D5DB' />
              <Text style={styles.emptyTitle}>No suggestions yet</Text>
              <Text style={styles.emptySubtitle}>Be the first to suggest something</Text>
            </View>
          ) : (
            suggestions.map((suggestion) => (
              <View key={suggestion.id} style={styles.card}>
                <Text style={styles.cardBody}>{suggestion.body}</Text>
                <View style={styles.cardFooter}>
                  <TouchableOpacity
                    style={[
                      styles.voteButton,
                      suggestion.user_has_voted && styles.voteButtonActive,
                    ]}
                    onPress={() => handleVote(suggestion)}
                    disabled={voteMutation.isPending}
                  >
                    <Ionicons
                      name='add'
                      size={16}
                      color={suggestion.user_has_voted ? '#FFF' : '#1f89ee'}
                    />
                    <Text
                      style={[
                        styles.voteCount,
                        suggestion.user_has_voted && styles.voteCountActive,
                      ]}
                    >
                      {suggestion.vote_count}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F9FF',
  },
  flex: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
    marginBottom: 24,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  headerTitles: {
    flex: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: '#2C3E50',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#78909C',
    fontWeight: '600',
    lineHeight: 20,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#1f89ee',
    borderStyle: 'dashed',
  },
  addButtonText: {
    color: '#1f89ee',
    fontWeight: '700',
    fontSize: 15,
  },
  formCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  textArea: {
    fontSize: 15,
    color: '#2C3E50',
    fontWeight: '600',
    minHeight: 100,
    textAlignVertical: 'top',
    lineHeight: 22,
  },
  charCount: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '500',
    textAlign: 'right',
    marginTop: 8,
    marginBottom: 12,
  },
  formActions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#6B7280',
  },
  submitButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#1f89ee',
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFF',
  },
  loader: {
    marginTop: 40,
  },
  emptyState: {
    alignItems: 'center',
    marginTop: 60,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#9CA3AF',
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#D1D5DB',
    fontWeight: '500',
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  cardBody: {
    fontSize: 15,
    color: '#2C3E50',
    fontWeight: '600',
    lineHeight: 22,
    marginBottom: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  voteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(31, 137, 238, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#1f89ee',
  },
  voteButtonActive: {
    backgroundColor: '#1f89ee',
  },
  voteCount: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1f89ee',
  },
  voteCountActive: {
    color: '#FFF',
  },
});
