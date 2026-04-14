import React from 'react';
import { useUser } from '@/hooks/useUser';
import { supabase } from '@/lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
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
import Purchases from 'react-native-purchases';

// TYPES & CONSTANTS

type Persona = 'player' | 'coach';

interface OnboardingData {
  persona: Persona | null;
  goal: string | null;
  painPoints: string[];
  name: string;
  email: string;
  password: string;
  coachGoal: string | null;
  dailyTarget: number;
}

const PLAYER_STEPS = [
  'welcome', 'persona', 'goal', 'pain', 'name',
  'social', 'solution', 'notif', 'processing',
  'dailygoal', 'demo', 'signup', 'paywall',
] as const;

const COACH_STEPS = [
  'welcome', 'persona', 'coachgoal', 'coachname',
  'coachsocial', 'coachnotif', 'coachsignup', 'coachpaywall',
] as const;

type Step = typeof PLAYER_STEPS[number] | typeof COACH_STEPS[number];

const DEMO_PLAYERS = [
  { name: 'Caleb', touches: 42030 },
  { name: 'Beau', touches: 34261 },
  { name: 'Lorenzo', touches: 14687 },
  { name: 'Jetson', touches: 7000 },
  { name: 'Edge', touches: 6627 },
];

const GOAL_OPTIONS = [
  { id: 'firsttouch', emoji: '🎯', label: 'First touch', sub: 'Sharper ball control' },
  { id: 'juggling', emoji: '⚽', label: 'Juggling', sub: 'Beat my personal best' },
  { id: 'fitness', emoji: '🏃', label: 'Match fitness', sub: 'More in the tank come game day' },
  { id: 'compete', emoji: '🔥', label: 'Outwork teammates', sub: 'Be the hardest worker' },
  { id: 'recruited', emoji: '🌟', label: 'Get recruited', sub: 'Stand out to coaches' },
  { id: 'habit', emoji: '💪', label: 'Build a habit', sub: 'Train consistently, not just match day' },
];

const PAIN_OPTIONS = [
  { id: 'forget', emoji: '😴', label: 'I forget to train on off-days' },
  { id: 'unsure', emoji: '🤷', label: "I don't know what to actually work on" },
  { id: 'motivation', emoji: '📉', label: 'Hard to stay motivated training alone' },
  { id: 'notrack', emoji: '🙈', label: "No way to track what I'm putting in" },
  { id: 'teamonly', emoji: '⏰', label: 'I only train when the team trains' },
  { id: 'random', emoji: '🎲', label: 'My sessions feel random' },
];

const COACH_GOAL_OPTIONS = [
  { id: 'consistent', emoji: '📈', label: 'More consistent training between sessions' },
  { id: 'visibility', emoji: '👁', label: "See who's putting in the work — without asking" },
  { id: 'motivate', emoji: '⚡', label: 'Motivate players without constant chasing' },
  { id: 'assign', emoji: '📋', label: 'Assign drills and challenges remotely' },
  { id: 'all', emoji: '🏆', label: 'All of the above' },
];

const GOAL_OPTIONS_MAP: Record<string, number> = {
  500: 500, 1000: 1000, 2500: 2500, 5000: 5000,
};

const TRAINING_TYPES = [
  { id: 'passing', emoji: '⚽', label: 'Passing' },
  { id: 'dribbling', emoji: '🏃', label: 'Dribbling' },
  { id: 'juggling', emoji: '🎯', label: 'Juggling' },
  { id: 'free', emoji: '✨', label: 'Free touch' },
];

// SOLUTION MAP — maps pain point IDs to feature descriptions
const SOLUTION_MAP: Record<string, { icon: string; pain: string; fix: string }> = {
  forget: { icon: '🔔', pain: 'Forgetting to train', fix: 'Daily reminders keep your streak alive — one ping and you\'re out the door' },
  unsure: { icon: '📋', pain: 'Not knowing what to work on', fix: 'Vinnie your AI coach gives you a drill every day matched to your goal' },
  motivation: { icon: '🏆', pain: 'Losing motivation alone', fix: 'The leaderboard means your teammates are always watching — even when you\'re not together' },
  notrack: { icon: '📊', pain: 'No way to track progress', fix: 'Every session logged, every touch counted — your history is always there' },
  teamonly: { icon: '🔥', pain: 'Only training with the team', fix: 'Daily targets give you something to hit every single day, not just match days' },
  random: { icon: '🎯', pain: 'Sessions feeling random', fix: 'Today\'s Challenge gives you a structured drill to start with, every morning' },
};

const DEFAULT_SOLUTIONS = [
  { icon: '🏆', pain: 'Lack of accountability', fix: 'The leaderboard means your teammates are always watching — even when you\'re not together' },
  { icon: '🔔', pain: 'Missing training days', fix: 'Daily reminders keep your streak alive — one ping and you\'re out the door' },
  { icon: '📋', pain: 'Not knowing what to do', fix: 'Vinnie your AI coach gives you a drill every day matched to your goal' },
  { icon: '📊', pain: 'No way to measure progress', fix: 'Every session logged, every touch counted — your history is always there' },
];

// MAIN ORCHESTRATOR

export default function OnboardingScreen() {
  const router = useRouter();
  const { data: user } = useUser();
  const [stepIndex, setStepIndex] = useState(0);
  const [data, setData] = useState<OnboardingData>({
    persona: null,
    goal: null,
    painPoints: [],
    name: '',
    email: '',
    password: '',
    coachGoal: null,
    dailyTarget: 1000,
  });

  const steps: readonly Step[] = data.persona === 'coach' ? COACH_STEPS : PLAYER_STEPS;
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
      })
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
      case 'goal':
        return (
          <GoalScreen
            selected={data.goal}
            onSelect={(g) => setData((d) => ({ ...d, goal: g }))}
            onNext={goNext}
          />
        );
      case 'pain':
        return (
          <PainScreen
            selected={data.painPoints}
            onToggle={(p) =>
              setData((d) => ({
                ...d,
                painPoints: d.painPoints.includes(p)
                  ? d.painPoints.filter((x) => x !== p)
                  : [...d.painPoints, p],
              }))
            }
            onNext={goNext}
          />
        );
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
      case 'solution':
        return <SolutionScreen painPoints={data.painPoints} onNext={goNext} />;
      case 'notif':
        return <NotifScreen onNext={goNext} />;
      case 'processing':
        return <ProcessingScreen onDone={goNext} />;
      case 'dailygoal':
        return (
          <DailyGoalScreen
            selected={data.dailyTarget}
            onSelect={(t) => setData((d) => ({ ...d, dailyTarget: t }))}
            onNext={goNext}
          />
        );
      case 'demo':
        return <DemoScreen name={data.name} onNext={goNext} />;
      case 'signup':
        return (
          <SignUpScreen
            email={data.email}
            password={data.password}
            onChangeEmail={(e) => setData((d) => ({ ...d, email: e }))}
            onChangePassword={(p) => setData((d) => ({ ...d, password: p }))}
            onNext={goNext}
          />
        );
      case 'paywall':
        return <PaywallScreen onNext={handleFinish} />;
      case 'coachgoal':
        return (
          <CoachGoalScreen
            selected={data.coachGoal}
            onSelect={(g) => setData((d) => ({ ...d, coachGoal: g }))}
            onNext={goNext}
          />
        );
      case 'coachname':
        return (
          <NameScreen
            value={data.name}
            onChange={(n) => setData((d) => ({ ...d, name: n }))}
            onNext={goNext}
            isCoach
          />
        );
      case 'coachsocial':
        return <CoachSocialScreen onNext={goNext} />;
      case 'coachnotif':
        return <CoachNotifScreen onNext={goNext} />;
      case 'coachsignup':
        return (
          <SignUpScreen
            email={data.email}
            password={data.password}
            onChangeEmail={(e) => setData((d) => ({ ...d, email: e }))}
            onChangePassword={(p) => setData((d) => ({ ...d, password: p }))}
            onNext={goNext}
          />
        );
      case 'coachpaywall':
        return <CoachPaywallScreen onNext={handleFinish} />;
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
            <TouchableOpacity onPress={goBack} style={s.backBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
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

function PrimaryButton({ label, onPress, disabled }: { label: string; onPress: () => void; disabled?: boolean }) {
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
            <Text style={s.welcomeHeadline}>{'Train every day.\nWatch your game change.'}</Text>
            <Text style={s.welcomeSub}>Log your touches. Build the habit. Climb the leaderboard.</Text>
          </View>

          {/* Leaderboard preview card */}
          <View style={s.leaderPreview}>
            <Text style={s.leaderPreviewLabel}>THIS WEEK'S TOP PLAYERS</Text>
            {DEMO_PLAYERS.slice(0, 3).map((p, i) => (
              <View key={p.name} style={s.leaderPreviewRow}>
                <Text style={s.leaderPreviewRank}>{['🥇', '🥈', '🥉'][i]}</Text>
                <Text style={s.leaderPreviewName}>{p.name}</Text>
                <Text style={s.leaderPreviewTouches}>{p.touches.toLocaleString()}</Text>
              </View>
            ))}
          </View>

          <View style={s.welcomeBottom}>
            <TouchableOpacity style={s.welcomeBtn} onPress={onNext} activeOpacity={0.85}>
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
        <Text style={s.subtitle}>We'll set things up based on your answer.</Text>
        <View style={s.personaRow}>
          <TouchableOpacity style={s.personaCard} onPress={() => onSelect('player')} activeOpacity={0.8}>
            <Text style={s.personaEmoji}>⚽</Text>
            <Text style={s.personaLabel}>Player</Text>
            <Text style={s.personaSub}>I want to improve my game</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.personaCard} onPress={() => onSelect('coach')} activeOpacity={0.8}>
            <Text style={s.personaEmoji}>📋</Text>
            <Text style={s.personaLabel}>Coach</Text>
            <Text style={s.personaSub}>I manage a team</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

// SCREEN 3 (PLAYER) — GOAL

function GoalScreen({ selected, onSelect, onNext }: { selected: string | null; onSelect: (g: string) => void; onNext: () => void }) {
  return (
    <View style={s.screen}>
      <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={s.title}>What are you trying to improve?</Text>
        <Text style={s.subtitle}>We'll set you up around this.</Text>
        {GOAL_OPTIONS.map((opt) => (
          <TouchableOpacity
            key={opt.id}
            style={[s.optionRow, selected === opt.id && s.optionRowSelected]}
            onPress={() => onSelect(opt.id)}
            activeOpacity={0.8}
          >
            <Text style={s.optionEmoji}>{opt.emoji}</Text>
            <View style={s.optionText}>
              <Text style={[s.optionLabel, selected === opt.id && s.optionLabelSelected]}>{opt.label}</Text>
              <Text style={s.optionSub}>{opt.sub}</Text>
            </View>
            {selected === opt.id && <Ionicons name='checkmark-circle' size={22} color='#1f89ee' />}
          </TouchableOpacity>
        ))}
        <View style={{ height: 16 }} />
        <PrimaryButton label='Continue' onPress={onNext} disabled={!selected} />
      </ScrollView>
    </View>
  );
}

// SCREEN 4 (PLAYER) — PAIN POINTS

function PainScreen({ selected, onToggle, onNext }: { selected: string[]; onToggle: (p: string) => void; onNext: () => void }) {
  return (
    <View style={s.screen}>
      <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={s.title}>What usually gets in the way?</Text>
        <Text style={s.subtitle}>Pick everything that applies.</Text>
        {PAIN_OPTIONS.map((opt) => {
          const active = selected.includes(opt.id);
          return (
            <TouchableOpacity
              key={opt.id}
              style={[s.optionRow, active && s.optionRowSelected]}
              onPress={() => onToggle(opt.id)}
              activeOpacity={0.8}
            >
              <Text style={s.optionEmoji}>{opt.emoji}</Text>
              <Text style={[s.optionLabel, active && s.optionLabelSelected, { flex: 1 }]}>{opt.label}</Text>
              <Ionicons
                name={active ? 'checkbox' : 'square-outline'}
                size={22}
                color={active ? '#1f89ee' : '#D1D5DB'}
              />
            </TouchableOpacity>
          );
        })}
        <View style={{ height: 16 }} />
        <PrimaryButton label='Continue' onPress={onNext} />
      </ScrollView>
    </View>
  );
}

// SCREEN 5 (PLAYER) / 4C (COACH) — NAME

function NameScreen({ value, onChange, onNext, isCoach }: { value: string; onChange: (n: string) => void; onNext: () => void; isCoach?: boolean }) {
  return (
    <KeyboardAvoidingView style={s.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={s.screenContent}>
        <Text style={s.title}>{isCoach ? 'What should your players call you?' : 'What do your teammates call you?'}</Text>
        <Text style={s.subtitle}>{isCoach ? 'This shows on your coach dashboard.' : 'This is the name that shows on the leaderboard.'}</Text>
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
        <PrimaryButton label="That's me →" onPress={onNext} disabled={value.trim().length === 0} />
      </View>
    </KeyboardAvoidingView>
  );
}

// SCREEN 6 (PLAYER) — SOCIAL PROOF

function SocialProofScreen({ onNext }: { onNext: () => void }) {
  return (
    <View style={s.screen}>
      <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={s.title}>Players are putting up real numbers</Text>
        <Text style={s.subtitle}>Here's what's possible when you train every day.</Text>

        <View style={s.heroStatCard}>
          <Text style={s.heroStatNumber}>42,030</Text>
          <Text style={s.heroStatLabel}>touches logged by one player in a single week</Text>
        </View>

        <View style={s.testimonialCard}>
          <Text style={s.testimonialText}>"I went from training twice a week to every single day. The leaderboard did that."</Text>
          <View style={s.testimonialFooter}>
            <View style={s.testimonialAvatar}><Text style={{ fontSize: 18 }}>⚽</Text></View>
            <View>
              <Text style={s.testimonialName}>Jake M.</Text>
              <Text style={s.testimonialRole}>U15 Midfielder</Text>
            </View>
          </View>
        </View>

        <View style={s.testimonialCard}>
          <Text style={s.testimonialText}>"My first touch used to let me down every game. One month of daily reps and it's a completely different story."</Text>
          <View style={s.testimonialFooter}>
            <View style={s.testimonialAvatar}><Text style={{ fontSize: 18 }}>🌟</Text></View>
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

// SCREEN 7 (PLAYER) — PERSONALISED SOLUTION

function SolutionScreen({ painPoints, onNext }: { painPoints: string[]; onNext: () => void }) {
  const items = painPoints.length > 0
    ? painPoints.slice(0, 4).map((p) => SOLUTION_MAP[p]).filter(Boolean)
    : DEFAULT_SOLUTIONS;

  const displayItems = items.length < 3 ? [...items, ...DEFAULT_SOLUTIONS].slice(0, 4) : items.slice(0, 4);

  return (
    <View style={s.screen}>
      <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={s.title}>{"Here's how we're going to help"}</Text>
        <Text style={s.subtitle}>Based on what you told us.</Text>
        {displayItems.map((item, i) => (
          <View key={i} style={s.solutionCard}>
            <Text style={s.solutionIcon}>{item.icon}</Text>
            <View style={s.solutionText}>
              <Text style={s.solutionPain}>{item.pain}</Text>
              <Text style={s.solutionFix}>{item.fix}</Text>
            </View>
          </View>
        ))}
        <View style={{ height: 16 }} />
        <PrimaryButton label="Let's go →" onPress={onNext} />
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
        <Text style={s.subtitle}>{"We'll remind you when you haven't hit your target yet."}</Text>
        <View style={s.notifBullets}>
          <View style={s.notifBulletRow}>
            <Text style={s.notifBulletIcon}>🏆</Text>
            <Text style={s.notifBulletText}>Stay ahead of teammates on the leaderboard</Text>
          </View>
          <View style={s.notifBulletRow}>
            <Text style={s.notifBulletIcon}>🔥</Text>
            <Text style={s.notifBulletText}>Protect your streak — one miss breaks the chain</Text>
          </View>
          <View style={s.notifBulletRow}>
            <Text style={s.notifBulletIcon}>📲</Text>
            <Text style={s.notifBulletText}>Reminders you can actually act on in 10 minutes</Text>
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

// SCREEN 9 (PLAYER) — PROCESSING (bouncing ball)

function ProcessingScreen({ onDone }: { onDone: () => void }) {
  const bounceY = useRef(new Animated.Value(0)).current;
  const scaleX = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Ball bounce
    Animated.loop(
      Animated.sequence([
        Animated.timing(bounceY, { toValue: -36, duration: 380, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(bounceY, { toValue: 0, duration: 380, easing: Easing.in(Easing.quad), useNativeDriver: true }),
      ]),
    ).start();

    // Squash shadow on land
    Animated.loop(
      Animated.sequence([
        Animated.timing(scaleX, { toValue: 0.6, duration: 380, useNativeDriver: true }),
        Animated.timing(scaleX, { toValue: 1, duration: 380, useNativeDriver: true }),
      ]),
    ).start();

    const t = setTimeout(onDone, 2000);
    return () => clearTimeout(t);
  }, []);

  return (
    <View style={s.processingContainer}>
      <View style={s.processingBall}>
        <Animated.Text style={[s.processingEmoji, { transform: [{ translateY: bounceY }] }]}>
          ⚽
        </Animated.Text>
        <Animated.View style={[s.processingShadow, { transform: [{ scaleX }] }]} />
      </View>
      <Text style={s.processingText}>Building your training profile...</Text>
    </View>
  );
}

// SCREEN 10 (PLAYER) — DAILY GOAL

const DAILY_GOALS = [
  { value: 500, label: '500', sub: 'Starting out', emoji: '🌱' },
  { value: 1000, label: '1,000', sub: 'Building habits', emoji: '💪' },
  { value: 2500, label: '2,500', sub: 'Getting serious', emoji: '🔥' },
  { value: 5000, label: '5,000', sub: 'Elite mode', emoji: '⭐' },
];

function DailyGoalScreen({ selected, onSelect, onNext }: { selected: number; onSelect: (t: number) => void; onNext: () => void }) {
  return (
    <View style={s.screen}>
      <View style={s.screenContent}>
        <Text style={s.title}>Set your daily target</Text>
        <Text style={s.subtitle}>You can always change this in settings.</Text>
        <View style={s.goalGrid}>
          {DAILY_GOALS.map((opt) => (
            <TouchableOpacity
              key={opt.value}
              style={[s.goalCard, selected === opt.value && s.goalCardSelected]}
              onPress={() => onSelect(opt.value)}
              activeOpacity={0.8}
            >
              <Text style={s.goalEmoji}>{opt.emoji}</Text>
              <Text style={[s.goalValue, selected === opt.value && s.goalValueSelected]}>{opt.label}</Text>
              <Text style={[s.goalSub, selected === opt.value && s.goalSubSelected]}>{opt.sub}</Text>
              {selected === opt.value && (
                <View style={s.goalCheck}>
                  <Ionicons name='checkmark' size={13} color='#FFF' />
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>
        <Text style={s.goalHint}>Caleb averages over 6,000 touches a day. Start where feels right — you can always go up.</Text>
      </View>
      <View style={s.bottomPad}>
        <PrimaryButton label='Set my target →' onPress={onNext} />
      </View>
    </View>
  );
}

// SCREEN 11 (PLAYER) — APP DEMO

function DemoScreen({ name, onNext }: { name: string; onNext: () => void }) {
  const [subStep, setSubStep] = useState<'type' | 'touches' | 'leaderboard'>('type');
  const [trainingType, setTrainingType] = useState<string | null>(null);
  const [touchInput, setTouchInput] = useState('');
  const rowAnims = useRef(DEMO_PLAYERS.map(() => new Animated.Value(0))).current;
  const myRowAnim = useRef(new Animated.Value(0)).current;

  const myTouches = parseInt(touchInput, 10) || 0;
  const displayName = name.trim() || 'You';

  const allEntries = [...DEMO_PLAYERS, { name: displayName, touches: myTouches, isUser: true }]
    .sort((a, b) => b.touches - a.touches);
  const myRank = allEntries.findIndex((p) => 'isUser' in p) + 1;

  const showLeaderboard = () => {
    setSubStep('leaderboard');
    const anims = [...rowAnims, myRowAnim];
    Animated.stagger(
      120,
      anims.map((a) => Animated.spring(a, { toValue: 1, useNativeDriver: true, friction: 8 })),
    ).start();
  };

  if (subStep === 'type') {
    return (
      <View style={s.screen}>
        <View style={s.screenContent}>
          <Text style={s.title}>Log your first session</Text>
          <Text style={s.subtitle}>Pick what you worked on today.</Text>
          <View style={s.typeGrid}>
            {TRAINING_TYPES.map((t) => (
              <TouchableOpacity
                key={t.id}
                style={[s.typeCard, trainingType === t.id && s.typeCardSelected]}
                onPress={() => setTrainingType(t.id)}
                activeOpacity={0.8}
              >
                <Text style={s.typeEmoji}>{t.emoji}</Text>
                <Text style={[s.typeLabel, trainingType === t.id && s.typeLabelSelected]}>{t.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        <View style={s.bottomPad}>
          <PrimaryButton label='Next →' onPress={() => setSubStep('touches')} disabled={!trainingType} />
        </View>
      </View>
    );
  }

  if (subStep === 'touches') {
    return (
      <KeyboardAvoidingView style={s.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={s.screenContent}>
          <Text style={s.title}>How many touches?</Text>
          <Text style={s.subtitle}>A rough estimate is fine — be honest with yourself.</Text>
          <TextInput
            style={s.touchCountInput}
            value={touchInput}
            onChangeText={(t) => setTouchInput(t.replace(/[^0-9]/g, ''))}
            keyboardType='number-pad'
            placeholder='0'
            placeholderTextColor='#B0BEC5'
            autoFocus
            maxLength={6}
          />
          <Text style={s.touchCountHint}>touches today</Text>
        </View>
        <View style={s.bottomPad}>
          <PrimaryButton label='See my rank →' onPress={showLeaderboard} disabled={myTouches === 0} />
        </View>
      </KeyboardAvoidingView>
    );
  }

  // Leaderboard reveal
  return (
    <View style={s.screen}>
      <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={s.title}>You're ranked #{myRank} 🎉</Text>
        <Text style={s.subtitle}>Here's how you stack up this week.</Text>
        {allEntries.map((entry, idx) => {
          const isUser = 'isUser' in entry;
          const anim = isUser ? myRowAnim : rowAnims[DEMO_PLAYERS.indexOf(entry as typeof DEMO_PLAYERS[0])];
          return (
            <Animated.View
              key={entry.name}
              style={[
                s.demoRow,
                isUser && s.demoRowMe,
                {
                  opacity: anim,
                  transform: [{ translateX: anim.interpolate({ inputRange: [0, 1], outputRange: [40, 0] }) }],
                },
              ]}
            >
              <View style={s.demoRank}>
                <Text style={s.demoRankText}>{idx + 1}</Text>
              </View>
              <Text style={[s.demoName, isUser && s.demoNameMe]} numberOfLines={1}>
                {entry.name}{isUser ? ' (you)' : ''}
              </Text>
              <Text style={[s.demoTouches, isUser && s.demoTouchesMe]}>
                {entry.touches.toLocaleString()}
              </Text>
            </Animated.View>
          );
        })}
        <View style={{ height: 16 }} />
        <PrimaryButton label="That's my spot 🎯" onPress={onNext} />
      </ScrollView>
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

function SignUpScreen({ email, password, onChangeEmail, onChangePassword, onNext }: SignUpScreenProps) {
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
      if (signUpError) throw signUpError;
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
        contentContainerStyle={s.screen}
        keyboardShouldPersistTaps='handled'
        showsVerticalScrollIndicator={false}
      >
        <Text style={s.title}>Create your account</Text>
        <Text style={s.subtitle}>Save your progress and join the leaderboard</Text>

        <View style={s.signupField}>
          <Text style={s.signupLabel}>Email</Text>
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

        <View style={s.signupField}>
          <Text style={s.signupLabel}>Password</Text>
          <TextInput
            style={s.signupInput}
            value={password}
            onChangeText={onChangePassword}
            placeholder='At least 6 characters'
            placeholderTextColor='#B0BEC5'
            secureTextEntry
          />
        </View>

        {error && <Text style={s.signupError}>{error}</Text>}

        <PrimaryButton
          label={loading ? 'Creating account…' : 'Create Account'}
          onPress={handleCreate}
          disabled={loading}
        />

        <TouchableOpacity
          style={s.signupSignInLink}
          onPress={() => router.replace('/(auth)')}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={s.signupSignInText}>Already have an account? <Text style={{ color: '#1f89ee' }}>Sign in</Text></Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// SCREEN 13 (PLAYER) — PAYWALL PLACEHOLDER

function PaywallScreen({ onNext }: { onNext: () => void }) {
  const [selectedPlan, setSelectedPlan] = useState<'annual' | 'monthly'>('annual');
  const [purchasing, setPurchasing] = useState(false);

  const handlePurchase = async () => {
    if (Platform.OS === 'web') { onNext(); return; }
    setPurchasing(true);
    try {
      const all = await Purchases.getOfferings();
      const offering = all.current;
      const pkg = selectedPlan === 'annual' ? offering?.annual : offering?.monthly;
      if (pkg) {
        await Purchases.purchasePackage(pkg);
      }
      onNext();
    } catch (e: any) {
      if (!e.userCancelled) {
        Alert.alert('Purchase failed', e.message ?? 'Something went wrong.');
      }
    } finally {
      setPurchasing(false);
    }
  };

  return (
    <View style={s.screen}>
      <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={s.paywallTitle}>Keep climbing with{'\n'}Master Touch Pro</Text>

        <View style={s.testimonialCard}>
          <Text style={s.starsRow}>⭐⭐⭐⭐⭐</Text>
          <Text style={s.testimonialText}>"The leaderboard is the reason I train every day now. I can't let my teammates get ahead."</Text>
          <View style={s.testimonialFooter}>
            <View style={s.testimonialAvatar}><Text style={{ fontSize: 18 }}>🔥</Text></View>
            <View>
              <Text style={s.testimonialName}>Marcus D.</Text>
              <Text style={s.testimonialRole}>Centre-back</Text>
            </View>
          </View>
        </View>

        <View style={s.paywallFeatures}>
          {['Full leaderboard access', 'Unlimited session history', 'Daily challenges & drills', 'AI coach tips from Vinnie', 'All achievements & badges'].map((f) => (
            <View key={f} style={s.paywallFeatureRow}>
              <Ionicons name='checkmark-circle' size={20} color='#31af4d' />
              <Text style={s.paywallFeatureText}>{f}</Text>
            </View>
          ))}
        </View>

        <View style={s.paywallPricing}>
          <TouchableOpacity style={[s.pricingOption, selectedPlan === 'annual' && s.pricingOptionSelected]} onPress={() => setSelectedPlan('annual')}>
            <View style={s.pricingBadge}><Text style={s.pricingBadgeText}>BEST VALUE</Text></View>
            <Text style={s.pricingPlan}>Annual</Text>
            <Text style={s.pricingAmount}>$34.99 / year</Text>
            <Text style={s.pricingMonthly}>Just $2.92/month</Text>
          </TouchableOpacity>
          <View style={s.pricingDivider} />
          <TouchableOpacity style={[s.pricingOption, selectedPlan === 'monthly' && s.pricingOptionSelected]} onPress={() => setSelectedPlan('monthly')}>
            <Text style={s.pricingPlan}>Monthly</Text>
            <Text style={s.pricingAmount}>$4.99 / month</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 16 }} />
        <TouchableOpacity style={[s.paywallCta, purchasing && { opacity: 0.6 }]} onPress={handlePurchase} activeOpacity={0.85} disabled={purchasing}>
          {purchasing
            ? <ActivityIndicator color='#FFF' />
            : <Text style={s.paywallCtaText}>Start my free 7-day trial</Text>
          }
        </TouchableOpacity>
        <TouchableOpacity style={s.skipLink} onPress={onNext} disabled={purchasing}>
          <Text style={s.skipLinkText}>Continue without Pro</Text>
        </TouchableOpacity>
        <Text style={s.paywallDisclaimer}>Cancel anytime · Billed annually · Restore purchases</Text>
      </ScrollView>
    </View>
  );
}

// SCREEN 3C (COACH) — COACH GOAL

function CoachGoalScreen({ selected, onSelect, onNext }: { selected: string | null; onSelect: (g: string) => void; onNext: () => void }) {
  return (
    <View style={s.screen}>
      <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={s.title}>What do you want for your squad?</Text>
        <Text style={s.subtitle}>Pick the one that matters most right now.</Text>
        {COACH_GOAL_OPTIONS.map((opt) => (
          <TouchableOpacity
            key={opt.id}
            style={[s.optionRow, selected === opt.id && s.optionRowSelected]}
            onPress={() => onSelect(opt.id)}
            activeOpacity={0.8}
          >
            <Text style={s.optionEmoji}>{opt.emoji}</Text>
            <Text style={[s.optionLabel, selected === opt.id && s.optionLabelSelected, { flex: 1 }]}>{opt.label}</Text>
            {selected === opt.id && <Ionicons name='checkmark-circle' size={22} color='#1f89ee' />}
          </TouchableOpacity>
        ))}
        <View style={{ height: 16 }} />
        <PrimaryButton label='Continue' onPress={onNext} disabled={!selected} />
      </ScrollView>
    </View>
  );
}

// SCREEN 5C (COACH) — COACH SOCIAL PROOF

function CoachSocialScreen({ onNext }: { onNext: () => void }) {
  return (
    <View style={s.screen}>
      <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={s.title}>Coaches are seeing it in the numbers</Text>
        <Text style={s.subtitle}>Real engagement between sessions — not just match days.</Text>

        <View style={s.heroStatCard}>
          <Text style={s.heroStatNumber}>42,030</Text>
          <Text style={s.heroStatLabel}>touches logged by one player in a single week</Text>
        </View>

        <View style={s.testimonialCard}>
          <Text style={s.testimonialText}>"I had no idea who was putting in extra work between sessions. Now I can see it before I even get to the pitch — and I use it every week."</Text>
          <View style={s.testimonialFooter}>
            <View style={s.testimonialAvatar}><Text style={{ fontSize: 18 }}>📋</Text></View>
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
        <Text style={s.title}>Know who needs a nudge before the next session</Text>
        <Text style={s.subtitle}>Stay across your squad without constant messages.</Text>
        <View style={s.notifBullets}>
          <View style={s.notifBulletRow}>
            <Text style={s.notifBulletIcon}>👁</Text>
            <Text style={s.notifBulletText}>{"See who hasn't logged touches this week"}</Text>
          </View>
          <View style={s.notifBulletRow}>
            <Text style={s.notifBulletIcon}>⚡</Text>
            <Text style={s.notifBulletText}>Send a challenge directly to a player's phone</Text>
          </View>
          <View style={s.notifBulletRow}>
            <Text style={s.notifBulletIcon}>📊</Text>
            <Text style={s.notifBulletText}>React before the next session, not after</Text>
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

// SCREEN 7C (COACH) — COACH PAYWALL PLACEHOLDER

function CoachPaywallScreen({ onNext }: { onNext: () => void }) {
  const [purchasing, setPurchasing] = useState(false);

  const handlePurchase = async () => {
    if (Platform.OS === 'web') { onNext(); return; }
    setPurchasing(true);
    try {
      const all = await Purchases.getOfferings();
      const pkg = all.all['coach']?.monthly;
      if (pkg) {
        await Purchases.purchasePackage(pkg);
      }
      onNext();
    } catch (e: any) {
      if (!e.userCancelled) {
        Alert.alert('Purchase failed', e.message ?? 'Something went wrong.');
      }
    } finally {
      setPurchasing(false);
    }
  };

  return (
    <View style={s.screen}>
      <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={s.paywallTitle}>{'One licence.\nYour whole squad.'}</Text>
        <Text style={s.subtitle}>Every player on your team gets Pro features — included.</Text>

        <View style={s.paywallFeatures}>
          {[
            'Full player dashboard with weekly touch reports',
            'Assign challenges to individuals or the whole squad',
            'Up to 3 teams under one account',
            'Players get Pro features free while on your team',
            'See who needs a nudge before every session',
          ].map((f) => (
            <View key={f} style={s.paywallFeatureRow}>
              <Ionicons name='checkmark-circle' size={20} color='#31af4d' />
              <Text style={s.paywallFeatureText}>{f}</Text>
            </View>
          ))}
        </View>

        <View style={[s.paywallPricing, { paddingVertical: 24 }]}>
          <Text style={s.pricingPlan}>Coach</Text>
          <Text style={[s.pricingAmount, { fontSize: 32 }]}>$19.99 / month</Text>
          <Text style={s.pricingMonthly}>Squad licence · cancel anytime</Text>
        </View>

        <View style={{ height: 16 }} />
        <TouchableOpacity style={[s.paywallCta, purchasing && { opacity: 0.6 }]} onPress={handlePurchase} activeOpacity={0.85} disabled={purchasing}>
          {purchasing
            ? <ActivityIndicator color='#FFF' />
            : <Text style={s.paywallCtaText}>Start coaching →</Text>
          }
        </TouchableOpacity>
        <TouchableOpacity style={s.skipLink} onPress={onNext} disabled={purchasing}>
          <Text style={s.skipLinkText}>Continue without Coach plan</Text>
        </TouchableOpacity>
        <Text style={s.paywallDisclaimer}>Restore purchases</Text>
      </ScrollView>
    </View>
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
  signupField: {
    marginBottom: 16,
  },
  signupLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1a1a2e',
    marginBottom: 6,
  },
  signupInput: {
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 16,
    color: '#1a1a2e',
    backgroundColor: '#FAFAFA',
  },
  signupError: {
    color: '#E53935',
    fontSize: 13,
    marginBottom: 12,
    textAlign: 'center',
  },
  signupSignInLink: {
    marginTop: 20,
    alignItems: 'center',
  },
  signupSignInText: {
    fontSize: 14,
    color: '#78909C',
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
    color: '#1a1a2e',
  },
  paywallDisclaimer: {
    fontSize: 12,
    fontWeight: '600',
    color: '#78909C',
    textAlign: 'center',
    marginTop: 8,
  },
});
