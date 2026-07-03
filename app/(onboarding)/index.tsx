import { useClubSearch } from '@/hooks/useClubSearch';
import { useUser } from '@/hooks/useUser';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Image,
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

// TYPES & CONSTANTS

type Persona = 'player' | 'coach';

interface OnboardingData {
  persona: Persona | null;
  goal: string | null;
  name: string;
  email: string;
  password: string;
  dailyTarget: number;
  clubId: string | null;
}

const PLAYER_STEPS = [
  'welcome',
  'persona',
  'social',
  'name',
  'notif',
  'signup',
  'club',
] as const;

const COACH_STEPS = [
  'welcome',
  'persona',
  'coachsocial',
  'coachname',
  'coachnotif',
  'coachsignup',
] as const;

type Step = (typeof PLAYER_STEPS)[number] | (typeof COACH_STEPS)[number];

const DEMO_PLAYERS = [
  { name: 'Caleb', touches: 42030 },
  { name: 'Beau', touches: 34261 },
  { name: 'Lorenzo', touches: 14687 },
  { name: 'Jetson', touches: 7000 },
  { name: 'Edge', touches: 6627 },
];


// MAIN ORCHESTRATOR

export default function OnboardingScreen() {
  const router = useRouter();
  const { data: user } = useUser();
  const [stepIndex, setStepIndex] = useState(0);
  const [data, setData] = useState<OnboardingData>({
    persona: 'player',
    goal: null,
    name: '',
    email: '',
    password: '',
    dailyTarget: 1000,
    clubId: null,
  });

  const steps: readonly Step[] =
    data.persona === 'coach' ? COACH_STEPS : PLAYER_STEPS;
  const currentStep = steps[stepIndex] as Step;
  const totalSteps = steps.length;

  const goNext = () => setStepIndex((i) => Math.min(i + 1, totalSteps - 1));
  const goBack = () => setStepIndex((i) => Math.max(i - 1, 0));

  const handlePersonaSelect = (persona: Persona) => {
    setData((d) => ({ ...d, persona }));
    setStepIndex(2);
  };

  const handleFinish = async () => {
    // user?.id may not be in the React Query cache yet if called immediately
    // after signUp, so fall back to a direct session fetch
    const userId = user?.id ?? (await supabase.auth.getUser()).data.user?.id;
    if (!userId) return;

    await supabase
      .from('profiles')
      .update({
        onboarding_completed: true,
        name: data.name || null,
        display_name: data.name || null,
        is_coach: data.persona === 'coach',
        skill_focus: data.goal || null,
        club_id: data.clubId || null,
      } as any)
      .eq('id', userId);

    if (data.persona === 'player') {
      await supabase.from('user_targets').upsert({
        user_id: userId,
        daily_target_touches: data.dailyTarget,
      });
    }

    await AsyncStorage.setItem('hasSeenIntro', 'true');
    router.replace('/(tabs)');
  };

  const renderStep = () => {
    switch (currentStep) {
      case 'welcome':
        return <WelcomeScreen onNext={goNext} />;
      case 'persona':
        return <PersonaScreen onSelect={handlePersonaSelect} />;
      case 'name':
        return (
          <NameScreen
            value={data.name}
            onChange={(n) => setData((d) => ({ ...d, name: n }))}
            onNext={goNext}
          />
        );
      case 'social':
        return <SocialProofScreen onNext={goNext} />;
      case 'notif':
        return <NotifScreen onNext={goNext} />;
      case 'club':
        return (
          <ClubSearchScreen
            selectedId={data.clubId}
            onSelect={(id) => setData((d) => ({ ...d, clubId: id }))}
            onNext={stepIndex === steps.length - 1 ? handleFinish : goNext}
          />
        );
      case 'signup':
        return (
          <SignUpScreen
            email={data.email}
            password={data.password}
            onChangeEmail={(e) => setData((d) => ({ ...d, email: e }))}
            onChangePassword={(p) => setData((d) => ({ ...d, password: p }))}
            onNext={stepIndex === steps.length - 1 ? handleFinish : goNext}
          />
        );
      case 'coachsocial':
        return <CoachSocialScreen onNext={goNext} />;
      case 'coachname':
        return (
          <NameScreen
            value={data.name}
            onChange={(n) => setData((d) => ({ ...d, name: n }))}
            onNext={goNext}
            isCoach
          />
        );
      case 'coachnotif':
        return <CoachNotifScreen onNext={goNext} />;
      case 'coachsignup':
        return (
          <SignUpScreen
            email={data.email}
            password={data.password}
            onChangeEmail={(e) => setData((d) => ({ ...d, email: e }))}
            onChangePassword={(p) => setData((d) => ({ ...d, password: p }))}
            onNext={stepIndex === steps.length - 1 ? handleFinish : goNext}
          />
        );
      default:
        return null;
    }
  };

  const showProgress = currentStep !== 'welcome';
  const showBack = stepIndex > 1;
  const progressPct = totalSteps > 1 ? (stepIndex / (totalSteps - 1)) * 100 : 0;

  if (currentStep === 'welcome' || currentStep === 'processing') {
    return renderStep() as React.ReactElement;
  }

  return (
    <SafeAreaView style={s.safeArea} edges={['top', 'bottom']}>
      {showProgress && (
        <View style={s.header}>
          {showBack ? (
            <TouchableOpacity
              onPress={goBack}
              style={s.backBtn}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name='chevron-back' size={24} color='#1a1a2e' />
            </TouchableOpacity>
          ) : (
            <View style={s.backBtn} />
          )}
          <View style={s.progressTrack}>
            <View style={[s.progressFill, { width: `${progressPct}%` }]} />
          </View>
          <View style={s.backBtn} />
        </View>
      )}
      {renderStep()}
    </SafeAreaView>
  );
}

// SHARED COMPONENTS

function PrimaryButton({
  label,
  onPress,
  disabled,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[s.primaryBtn, disabled && s.primaryBtnDisabled]}
      onPress={onPress}
      activeOpacity={0.85}
      disabled={disabled}
    >
      <Text style={s.primaryBtnText}>{label}</Text>
    </TouchableOpacity>
  );
}

// SCREEN 1 — WELCOME

function WelcomeScreen({ onNext }: { onNext: () => void }) {
  return (
    <View style={{ flex: 1, backgroundColor: '#1a1a2e' }}>
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <View style={s.welcomeContainer}>
          <View style={s.welcomeTop}>
            <Text style={s.welcomeAppName}>MASTER TOUCH</Text>
            <Text style={s.welcomeHeadline}>
              {'Train every day.\nWatch your game change.'}
            </Text>
            <Text style={s.welcomeSub}>
              Log your touches. Build the habit. Climb the leaderboard.
            </Text>
          </View>

          {/* Leaderboard preview card */}
          <View style={s.leaderPreview}>
            <Text style={s.leaderPreviewLabel}>THIS WEEK'S TOP PLAYERS</Text>
            {DEMO_PLAYERS.slice(0, 3).map((p, i) => (
              <View key={p.name} style={s.leaderPreviewRow}>
                <Text style={s.leaderPreviewRank}>{['🥇', '🥈', '🥉'][i]}</Text>
                <Text style={s.leaderPreviewName}>{p.name}</Text>
                <Text style={s.leaderPreviewTouches}>
                  {p.touches.toLocaleString()}
                </Text>
              </View>
            ))}
          </View>

          <View style={s.welcomeBottom}>
            <TouchableOpacity
              style={s.welcomeBtn}
              onPress={onNext}
              activeOpacity={0.85}
            >
              <Text style={s.welcomeBtnText}>Get Started</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

// SCREEN 2 — PERSONA

function PersonaScreen({ onSelect }: { onSelect: (p: Persona) => void }) {
  return (
    <View style={s.screen}>
      <View style={s.screenContent}>
        <Text style={s.title}>Are you a player or a coach?</Text>
        <Text style={s.subtitle}>
          We'll set things up based on your answer.
        </Text>
        <View style={s.personaRow}>
          <TouchableOpacity
            style={s.personaCard}
            onPress={() => onSelect('player')}
            activeOpacity={0.8}
          >
            <Text style={s.personaEmoji}>⚽</Text>
            <Text style={s.personaLabel}>Player</Text>
            <Text style={s.personaSub}>I want to improve my game</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={s.personaCard}
            onPress={() => onSelect('coach')}
            activeOpacity={0.8}
          >
            <Text style={s.personaEmoji}>📋</Text>
            <Text style={s.personaLabel}>Coach</Text>
            <Text style={s.personaSub}>I manage a team</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

// SCREEN 5 (PLAYER) / 4C (COACH) — NAME

function NameScreen({
  value,
  onChange,
  onNext,
  isCoach,
}: {
  value: string;
  onChange: (n: string) => void;
  onNext: () => void;
  isCoach?: boolean;
}) {
  return (
    <KeyboardAvoidingView
      style={s.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={s.screenContent}>
        <Text style={s.title}>
          {isCoach
            ? 'What should your players call you?'
            : 'What do your teammates call you?'}
        </Text>
        <Text style={s.subtitle}>
          {isCoach
            ? 'This shows on your coach dashboard.'
            : "This shows on the leaderboard. If you're signing up for your child, enter their name."}
        </Text>
        <TextInput
          style={s.nameInput}
          value={value}
          onChangeText={onChange}
          placeholder={isCoach ? 'Coach Smith' : 'Your name or nickname'}
          placeholderTextColor='#B0BEC5'
          autoFocus
          returnKeyType='done'
          onSubmitEditing={value.trim().length > 0 ? onNext : undefined}
          maxLength={30}
        />
      </View>
      <View style={s.bottomPad}>
        <PrimaryButton
          label="That's me →"
          onPress={onNext}
          disabled={value.trim().length === 0}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

// SCREEN 6 (PLAYER) — SOCIAL PROOF

function SocialProofScreen({ onNext }: { onNext: () => void }) {
  return (
    <View style={s.screen}>
      <ScrollView
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={s.title}>Players are putting up real numbers</Text>
        <Text style={s.subtitle}>
          Here's what's possible when you train every day.
        </Text>

        <View style={s.heroStatCard}>
          <Text style={s.heroStatNumber}>42,030</Text>
          <Text style={s.heroStatLabel}>
            touches logged by one player in a single week
          </Text>
        </View>

        <View style={s.testimonialCard}>
          <Text style={s.testimonialText}>
            "I went from training twice a week to every single day. The
            leaderboard did that."
          </Text>
          <View style={s.testimonialFooter}>
            <View style={s.testimonialAvatar}>
              <Text style={{ fontSize: 18 }}>⚽</Text>
            </View>
            <View>
              <Text style={s.testimonialName}>Jake M.</Text>
              <Text style={s.testimonialRole}>U15 Midfielder</Text>
            </View>
          </View>
        </View>

        <View style={s.testimonialCard}>
          <Text style={s.testimonialText}>
            "My first touch used to let me down every game. One month of daily
            reps and it's a completely different story."
          </Text>
          <View style={s.testimonialFooter}>
            <View style={s.testimonialAvatar}>
              <Text style={{ fontSize: 18 }}>🌟</Text>
            </View>
            <View>
              <Text style={s.testimonialName}>Alex T.</Text>
              <Text style={s.testimonialRole}>Forward</Text>
            </View>
          </View>
        </View>

        <View style={{ height: 16 }} />
        <PrimaryButton label='That could be me →' onPress={onNext} />
      </ScrollView>
    </View>
  );
}

// SCREEN 8 (PLAYER) — NOTIFICATION PRIMING

function NotifScreen({ onNext }: { onNext: () => void }) {
  const handleEnable = async () => {
    await Notifications.requestPermissionsAsync();
    onNext();
  };

  return (
    <View style={s.screen}>
      <View style={s.screenContent}>
        <Text style={s.notifEmoji}>🔔</Text>
        <Text style={s.title}>Never miss a training day</Text>
        <Text style={s.subtitle}>
          {"We'll remind you when you haven't hit your target yet."}
        </Text>
        <View style={s.notifBullets}>
          <View style={s.notifBulletRow}>
            <Text style={s.notifBulletIcon}>🏆</Text>
            <Text style={s.notifBulletText}>
              Stay ahead of teammates on the leaderboard
            </Text>
          </View>
          <View style={s.notifBulletRow}>
            <Text style={s.notifBulletIcon}>🔥</Text>
            <Text style={s.notifBulletText}>
              Protect your streak — one miss breaks the chain
            </Text>
          </View>
          <View style={s.notifBulletRow}>
            <Text style={s.notifBulletIcon}>📲</Text>
            <Text style={s.notifBulletText}>
              Reminders you can actually act on in 10 minutes
            </Text>
          </View>
        </View>
      </View>
      <View style={s.bottomPad}>
        <PrimaryButton label='Enable reminders' onPress={handleEnable} />
        <TouchableOpacity style={s.skipLink} onPress={onNext}>
          <Text style={s.skipLinkText}>Not now</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// SCREEN 12 (SHARED) — SIGN UP

interface SignUpScreenProps {
  email: string;
  password: string;
  onChangeEmail: (v: string) => void;
  onChangePassword: (v: string) => void;
  onNext: () => void;
}

function SignUpScreen({
  email,
  password,
  onChangeEmail,
  onChangePassword,
  onNext,
}: SignUpScreenProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!email.trim() || !password) {
      setError('Please enter your email and password');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const { error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      });

      if (signUpError) {
        const msg = signUpError.message.toLowerCase();
        if (msg.includes('already registered') || msg.includes('already been registered') || msg.includes('user already')) {
          // Email exists — try signing in with the same credentials
          const { error: signInError } = await supabase.auth.signInWithPassword({
            email: email.trim(),
            password,
          });
          if (signInError) {
            setError('That email is already registered. Please check your password.');
            return;
          }
          onNext();
          return;
        }
        throw signUpError;
      }
      onNext();
    } catch (e: any) {
      setError(e.message ?? 'Sign up failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={s.scrollContent}
        keyboardShouldPersistTaps='handled'
        showsVerticalScrollIndicator={false}
      >
        <View style={s.signupHeader}>
          <Image
            source={require('../../assets/images/app-logo.png')}
            style={s.signupLogo}
          />
          <Text style={s.title}>Create your account</Text>
          <Text style={s.subtitle}>
            Save your progress and join the leaderboard
          </Text>
        </View>

        <View style={s.signupCard}>
          <View style={s.signupField}>
            <Text style={s.signupLabel}>Email</Text>
            <View style={s.signupInputRow}>
              <Ionicons name='mail-outline' size={20} color='#78909C' />
              <TextInput
                style={s.signupInput}
                value={email}
                onChangeText={onChangeEmail}
                placeholder='you@example.com'
                placeholderTextColor='#B0BEC5'
                autoCapitalize='none'
                keyboardType='email-address'
                autoCorrect={false}
              />
            </View>
          </View>

          <View style={s.signupField}>
            <Text style={s.signupLabel}>Password</Text>
            <View style={s.signupInputRow}>
              <Ionicons name='lock-closed-outline' size={20} color='#78909C' />
              <TextInput
                style={s.signupInput}
                value={password}
                onChangeText={onChangePassword}
                placeholder='At least 6 characters'
                placeholderTextColor='#B0BEC5'
                secureTextEntry
              />
            </View>
          </View>

          {error && <Text style={s.signupError}>{error}</Text>}

          <TouchableOpacity
            style={[
              s.signupBtn,
              (loading || !email.trim() || !password) && s.signupBtnDisabled,
            ]}
            onPress={handleCreate}
            disabled={loading || !email.trim() || !password}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color='#FFF' />
            ) : (
              <Text style={s.signupBtnText}>Create Account</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={s.signupSignInLink}
            onPress={() => router.replace('/(auth)')}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={s.signupSignInText}>
              Already have an account?{' '}
              <Text style={{ color: '#1f89ee' }}>Sign in</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// SCREEN 5C (COACH) — COACH SOCIAL PROOF

function CoachSocialScreen({ onNext }: { onNext: () => void }) {
  return (
    <View style={s.screen}>
      <ScrollView
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={s.title}>Coaches are seeing it in the numbers</Text>
        <Text style={s.subtitle}>
          Real engagement between sessions — not just match days.
        </Text>

        <View style={s.heroStatCard}>
          <Text style={s.heroStatNumber}>42,030</Text>
          <Text style={s.heroStatLabel}>
            touches logged by one player in a single week
          </Text>
        </View>

        <View style={s.testimonialCard}>
          <Text style={s.testimonialText}>
            "I had no idea who was putting in extra work between sessions. Now I
            can see it before I even get to the pitch — and I use it every
            week."
          </Text>
          <View style={s.testimonialFooter}>
            <View style={s.testimonialAvatar}>
              <Text style={{ fontSize: 18 }}>📋</Text>
            </View>
            <View>
              <Text style={s.testimonialName}>Coach T.</Text>
              <Text style={s.testimonialRole}>Youth Academy Coach</Text>
            </View>
          </View>
        </View>

        <View style={{ height: 16 }} />
        <PrimaryButton label="That's what I want →" onPress={onNext} />
      </ScrollView>
    </View>
  );
}

// SCREEN 6C (COACH) — COACH NOTIFICATION PRIMING

function CoachNotifScreen({ onNext }: { onNext: () => void }) {
  const handleEnable = async () => {
    await Notifications.requestPermissionsAsync();
    onNext();
  };

  return (
    <View style={s.screen}>
      <View style={s.screenContent}>
        <Text style={s.notifEmoji}>📱</Text>
        <Text style={s.title}>
          Know who needs a nudge before the next session
        </Text>
        <Text style={s.subtitle}>
          Stay across your squad without constant messages.
        </Text>
        <View style={s.notifBullets}>
          <View style={s.notifBulletRow}>
            <Text style={s.notifBulletIcon}>👁</Text>
            <Text style={s.notifBulletText}>
              {"See who hasn't logged touches this week"}
            </Text>
          </View>
          <View style={s.notifBulletRow}>
            <Text style={s.notifBulletIcon}>⚡</Text>
            <Text style={s.notifBulletText}>
              Send a challenge directly to a player's phone
            </Text>
          </View>
          <View style={s.notifBulletRow}>
            <Text style={s.notifBulletIcon}>📊</Text>
            <Text style={s.notifBulletText}>
              React before the next session, not after
            </Text>
          </View>
        </View>
      </View>
      <View style={s.bottomPad}>
        <PrimaryButton label='Enable coach alerts' onPress={handleEnable} />
        <TouchableOpacity style={s.skipLink} onPress={onNext}>
          <Text style={s.skipLinkText}>Not now</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// SCREEN — CLUB SEARCH (player onboarding)

function ClubSearchScreen({
  selectedId,
  onSelect,
  onNext,
}: {
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onNext: () => void;
}) {
  const [query, setQuery] = useState('');
  const { data: results = [], isFetching } = useClubSearch(query);

  return (
    <KeyboardAvoidingView
      style={s.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={s.scrollContent}
        keyboardShouldPersistTaps='handled'
        showsVerticalScrollIndicator={false}
      >
        <Text style={s.title}>Find your club</Text>
        <Text style={s.subtitle}>
          Search for your soccer club or academy to join their leaderboard.
        </Text>

        <View style={s.clubSearchInputRow}>
          <Ionicons name='search-outline' size={20} color='#78909C' />
          <TextInput
            style={s.clubSearchInput}
            value={query}
            onChangeText={setQuery}
            placeholder='Search club name...'
            placeholderTextColor='#B0BEC5'
            autoCorrect={false}
            returnKeyType='search'
          />
          {isFetching && <ActivityIndicator size='small' color='#1f89ee' />}
        </View>

        {query.trim().length >= 2 && results.length === 0 && !isFetching && (
          <Text style={s.clubSearchEmpty}>No clubs found for "{query}"</Text>
        )}

        {results.map((club) => (
          <TouchableOpacity
            key={club.id}
            style={[
              s.optionRow,
              selectedId === club.id && s.optionRowSelected,
            ]}
            onPress={() => onSelect(selectedId === club.id ? null : club.id)}
            activeOpacity={0.8}
          >
            <Text style={s.optionEmoji}>🏟️</Text>
            <Text
              style={[
                s.optionLabel,
                { flex: 1 },
                selectedId === club.id && s.optionLabelSelected,
              ]}
            >
              {club.name}
            </Text>
            {selectedId === club.id && (
              <Ionicons name='checkmark-circle' size={22} color='#1f89ee' />
            )}
          </TouchableOpacity>
        ))}

        <View style={{ height: 16 }} />
        <PrimaryButton
          label={selectedId ? 'Join this club →' : 'Continue'}
          onPress={onNext}
        />
        {!selectedId && (
          <TouchableOpacity style={s.skipLink} onPress={onNext}>
            <Text style={s.skipLinkText}>My club isn't listed — skip</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// STYLES

const s = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },

  // HEADER
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    gap: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressTrack: {
    flex: 1,
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#1f89ee',
    borderRadius: 2,
  },

  // SCREEN WRAPPER
  screen: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  screenContent: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 32,
  },
  bottomPad: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    gap: 8,
  },

  // TYPOGRAPHY
  title: {
    fontSize: 26,
    fontWeight: '900',
    color: '#1a1a2e',
    marginBottom: 8,
    lineHeight: 32,
  },
  subtitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#78909C',
    marginBottom: 24,
  },

  // SIGN UP SCREEN
  signupHeader: {
    alignItems: 'center',
    marginBottom: 28,
  },
  signupLogo: {
    width: 90,
    height: 90,
    borderRadius: 20,
    marginBottom: 20,
  },
  signupCard: {
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 6,
  },
  signupField: {
    marginBottom: 20,
  },
  signupLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1a1a2e',
    marginBottom: 8,
    marginLeft: 4,
  },
  signupInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F7FA',
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#E8EAF6',
    paddingHorizontal: 16,
    gap: 12,
  },
  signupInput: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 16,
    color: '#1a1a2e',
    fontWeight: '600',
  },
  signupError: {
    color: '#E53935',
    fontSize: 13,
    marginBottom: 12,
    textAlign: 'center',
  },
  signupBtn: {
    marginTop: 8,
    borderRadius: 16,
    backgroundColor: '#ffb724',
    paddingVertical: 18,
    alignItems: 'center',
    shadowColor: '#ffb724',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  signupBtnDisabled: {
    opacity: 0.5,
    shadowOpacity: 0,
    elevation: 0,
  },
  signupBtnText: {
    fontSize: 17,
    fontWeight: '900',
    color: '#FFF',
    letterSpacing: 0.5,
  },
  signupSignInLink: {
    marginTop: 20,
    alignItems: 'center',
  },
  signupSignInText: {
    fontSize: 14,
    color: '#78909C',
    fontWeight: '600',
  },

  // PRIMARY BUTTON
  primaryBtn: {
    backgroundColor: '#1f89ee',
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
  },
  primaryBtnDisabled: {
    backgroundColor: '#B0BEC5',
  },
  primaryBtnText: {
    fontSize: 17,
    fontWeight: '900',
    color: '#FFF',
  },

  // OPTION ROWS
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    gap: 12,
  },
  optionRowSelected: {
    borderColor: '#1f89ee',
    backgroundColor: '#EBF4FF',
  },
  optionEmoji: {
    fontSize: 22,
  },
  optionText: {
    flex: 1,
    gap: 2,
  },
  optionLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1a1a2e',
  },
  optionLabelSelected: {
    color: '#1f89ee',
  },
  optionSub: {
    fontSize: 12,
    fontWeight: '600',
    color: '#78909C',
  },

  // WELCOME SCREEN
  welcomeContainer: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 32,
    justifyContent: 'space-between',
  },
  welcomeTop: {
    gap: 16,
  },
  welcomeAppName: {
    fontSize: 12,
    fontWeight: '900',
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: 3,
  },
  welcomeHeadline: {
    fontSize: 38,
    fontWeight: '900',
    color: '#FFF',
    lineHeight: 44,
  },
  welcomeSub: {
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
    lineHeight: 24,
  },
  leaderPreview: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    gap: 14,
  },
  leaderPreviewLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  leaderPreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  leaderPreviewRank: {
    fontSize: 20,
    width: 28,
    textAlign: 'center',
  },
  leaderPreviewName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '900',
    color: '#FFF',
  },
  leaderPreviewTouches: {
    fontSize: 16,
    fontWeight: '900',
    color: '#ffb724',
  },
  welcomeBottom: {
    gap: 12,
  },
  welcomeBtn: {
    backgroundColor: '#1f89ee',
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
  },
  welcomeBtnText: {
    fontSize: 17,
    fontWeight: '900',
    color: '#FFF',
  },

  // PERSONA SCREEN
  personaRow: {
    flexDirection: 'row',
    gap: 14,
    marginTop: 8,
  },
  personaCard: {
    flex: 1,
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    gap: 8,
  },
  personaEmoji: {
    fontSize: 40,
  },
  personaLabel: {
    fontSize: 18,
    fontWeight: '900',
    color: '#1a1a2e',
  },
  personaSub: {
    fontSize: 12,
    fontWeight: '600',
    color: '#78909C',
    textAlign: 'center',
  },

  // NAME SCREEN
  nameInput: {
    backgroundColor: '#FFF',
    borderRadius: 14,
    padding: 18,
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a2e',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    marginTop: 8,
  },

  // SOCIAL PROOF
  heroStatCard: {
    backgroundColor: '#1a1a2e',
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  heroStatNumber: {
    fontSize: 52,
    fontWeight: '900',
    color: '#ffb724',
  },
  heroStatLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    lineHeight: 20,
  },
  testimonialCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 18,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 12,
  },
  testimonialText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a2e',
    lineHeight: 22,
    fontStyle: 'italic',
  },
  testimonialFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  testimonialAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  testimonialName: {
    fontSize: 13,
    fontWeight: '900',
    color: '#1a1a2e',
  },
  testimonialRole: {
    fontSize: 12,
    fontWeight: '600',
    color: '#78909C',
  },
  starsRow: {
    fontSize: 16,
  },

  // SOLUTION SCREEN
  solutionCard: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 14,
    alignItems: 'flex-start',
  },
  solutionIcon: {
    fontSize: 24,
    marginTop: 2,
  },
  solutionText: {
    flex: 1,
    gap: 4,
  },
  solutionPain: {
    fontSize: 12,
    fontWeight: '600',
    color: '#78909C',
  },
  solutionFix: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1a1a2e',
    lineHeight: 20,
  },

  // NOTIFICATION SCREEN
  notifEmoji: {
    fontSize: 56,
    marginBottom: 16,
  },
  notifBullets: {
    gap: 16,
    marginTop: 8,
  },
  notifBulletRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  notifBulletIcon: {
    fontSize: 20,
    marginTop: 2,
  },
  notifBulletText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#1a1a2e',
    lineHeight: 22,
  },
  skipLink: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  skipLinkText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#78909C',
  },

  // PROCESSING SCREEN
  processingContainer: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  processingBall: {
    alignItems: 'center',
    height: 120,
    justifyContent: 'flex-end',
  },
  processingEmoji: {
    fontSize: 72,
    marginBottom: 12,
  },
  processingShadow: {
    width: 48,
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 24,
  },
  processingText: {
    fontSize: 17,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.8)',
    marginTop: 32,
  },

  // DAILY GOAL SCREEN
  goalGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 4,
  },
  goalCard: {
    width: '47%',
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    gap: 4,
  },
  goalCardSelected: {
    borderColor: '#1f89ee',
    backgroundColor: '#EBF4FF',
  },
  goalEmoji: {
    fontSize: 28,
    marginBottom: 4,
  },
  goalValue: {
    fontSize: 22,
    fontWeight: '900',
    color: '#1a1a2e',
  },
  goalValueSelected: {
    color: '#1f89ee',
  },
  goalSub: {
    fontSize: 12,
    fontWeight: '600',
    color: '#78909C',
  },
  goalSubSelected: {
    color: '#1f89ee',
  },
  goalCheck: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#1f89ee',
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalHint: {
    fontSize: 12,
    fontWeight: '600',
    color: '#78909C',
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 18,
  },

  // DEMO SCREEN
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 8,
  },
  typeCard: {
    width: '47%',
    backgroundColor: '#FFF',
    borderRadius: 16,
    paddingVertical: 24,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    gap: 8,
  },
  typeCardSelected: {
    borderColor: '#1f89ee',
    backgroundColor: '#EBF4FF',
  },
  typeEmoji: {
    fontSize: 32,
  },
  typeLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1a1a2e',
  },
  typeLabelSelected: {
    color: '#1f89ee',
  },
  touchCountInput: {
    fontSize: 72,
    fontWeight: '900',
    color: '#1a1a2e',
    textAlign: 'center',
    marginTop: 24,
  },
  touchCountHint: {
    fontSize: 16,
    fontWeight: '600',
    color: '#78909C',
    textAlign: 'center',
    marginTop: 8,
  },
  demoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 12,
  },
  demoRowMe: {
    borderColor: '#1f89ee',
    backgroundColor: '#EBF4FF',
  },
  demoRank: {
    width: 28,
    alignItems: 'center',
  },
  demoRankText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#78909C',
  },
  demoName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '900',
    color: '#1a1a2e',
  },
  demoNameMe: {
    color: '#1f89ee',
  },
  demoTouches: {
    fontSize: 15,
    fontWeight: '900',
    color: '#1a1a2e',
  },
  demoTouchesMe: {
    color: '#1f89ee',
  },

  // CLUB SEARCH SCREEN
  clubSearchInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    paddingHorizontal: 16,
    gap: 10,
    marginBottom: 12,
  },
  clubSearchInput: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 16,
    color: '#1a1a2e',
    fontWeight: '600',
  },
  clubSearchEmpty: {
    fontSize: 14,
    fontWeight: '600',
    color: '#78909C',
    textAlign: 'center',
    marginBottom: 16,
  },

  // PAYWALL SCREEN
  paywallTitle: {
    fontSize: 30,
    fontWeight: '900',
    color: '#1a1a2e',
    marginBottom: 8,
    lineHeight: 36,
  },
  paywallFeatures: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    marginTop: 16,
    marginBottom: 16,
    gap: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  paywallFeatureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  paywallFeatureText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a2e',
    flex: 1,
  },
  paywallPricing: {
    backgroundColor: '#F8F9FA',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 4,
  },
  pricingOption: {
    alignItems: 'center',
    gap: 4,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
    paddingHorizontal: 12,
  },
  pricingOptionSelected: {
    borderColor: '#1f89ee',
    backgroundColor: '#EFF7FF',
  },
  pricingBadge: {
    backgroundColor: '#ffb724',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginBottom: 4,
  },
  pricingBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#1a1a2e',
    letterSpacing: 1,
  },
  pricingPlan: {
    fontSize: 14,
    fontWeight: '700',
    color: '#78909C',
  },
  pricingAmount: {
    fontSize: 24,
    fontWeight: '900',
    color: '#1a1a2e',
  },
  pricingMonthly: {
    fontSize: 12,
    fontWeight: '600',
    color: '#78909C',
  },
  pricingDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 8,
  },
  paywallCta: {
    backgroundColor: '#ffb724',
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
  },
  paywallCtaText: {
    fontSize: 17,
    fontWeight: '900',
    color: '#FFF',
  },
  paywallDisclaimer: {
    fontSize: 12,
    fontWeight: '600',
    color: '#78909C',
    textAlign: 'center',
    marginTop: 8,
  },
});
