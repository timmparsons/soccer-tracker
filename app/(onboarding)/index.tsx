import { useUser } from '@/hooks/useUser';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewToken,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');

interface Slide {
  id: string;
  title: string;
  description: string;
  icon: string;
  gradientColors: [string, string, string];
  accentEmoji: string;
  isGoalSlide?: boolean;
}

const slides: Slide[] = [
  {
    id: '1',
    title: 'The Secret of\nGreat Players',
    description:
      'At top academies in Holland, Spain, and Brazil, young players complete 10,000 ball touches every single day.',
    icon: 'football',
    gradientColors: ['#667eea', '#764ba2', '#6B8DD6'],
    accentEmoji: '⚽',
  },
  {
    id: '2',
    title: 'Every Touch\nCounts',
    description:
      '10,000 touches a day, six days a week, adds up to over 3 million extra touches in a year. Like coins in a piggybank.',
    icon: 'trending-up',
    gradientColors: ['#11998e', '#38ef7d', '#11998e'],
    accentEmoji: '📈',
  },
  {
    id: '3',
    title: 'Train on\nYour Own',
    description:
      "The best players at La Masia, Clairefontaine, and Ajax all trained independently before they were scouted.",
    icon: 'person',
    gradientColors: ['#F2994A', '#F2C94C', '#F2994A'],
    accentEmoji: '🎯',
  },
  {
    id: '4',
    title: 'Track Your\nProgress',
    description:
      'Log your daily touches, see your improvement over time, and compete with your teammates.',
    icon: 'stats-chart',
    gradientColors: ['#4776E6', '#8E54E9', '#4776E6'],
    accentEmoji: '🏆',
  },
  {
    id: '5',
    title: 'Set Your\nDaily Goal',
    description: 'How many touches will you aim for each day?',
    icon: 'flag',
    gradientColors: ['#8E2DE2', '#4A00E0', '#8E2DE2'],
    accentEmoji: '🎯',
    isGoalSlide: true,
  },
  {
    id: '6',
    title: "Let's\nBegin",
    description:
      'The players who separate themselves from the pack do it on their own time.',
    icon: 'rocket',
    gradientColors: ['#FF416C', '#FF4B2B', '#FF416C'],
    accentEmoji: '🚀',
  },
];

const goalOptions = [
  { value: 500, label: '500', subtitle: 'Starting out', emoji: '🌱' },
  { value: 1000, label: '1,000', subtitle: 'Building habits', emoji: '💪' },
  { value: 2500, label: '2,500', subtitle: 'Getting serious', emoji: '🔥' },
  { value: 5000, label: '5,000', subtitle: 'Elite mode', emoji: '⭐' },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const { data: user } = useUser();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [dailyTarget, setDailyTarget] = useState(1000);
  const flatListRef = useRef<FlatList<Slide>>(null);
  const scrollX = useRef(new Animated.Value(0)).current;

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0) {
        setCurrentIndex(viewableItems[0].index ?? 0);
      }
    }
  ).current;

  const handleNext = () => {
    if (currentIndex < slides.length - 1) {
      flatListRef.current?.scrollToIndex({
        index: currentIndex + 1,
        animated: true,
      });
    } else {
      handleFinish();
    }
  };

  const handleSkip = () => {
    handleFinish();
  };

  const handleFinish = async () => {
    if (!user?.id) return;

    // Mark onboarding as completed
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        onboarding_completed: true,
      })
      .eq('id', user.id);

    if (profileError) {
      // If update failed, try to create profile
      await supabase
        .from('profiles')
        .insert({
          id: user.id,
          onboarding_completed: true,
        });
    }

    // Save daily target to user_targets table
    await supabase
      .from('user_targets')
      .upsert({
        user_id: user.id,
        daily_target_touches: dailyTarget,
      });

    router.replace('/(tabs)');
  };

  const renderSlide = ({ item }: { item: Slide }) => {
    if (item.isGoalSlide) {
      return (
        <View style={styles.slideContainer}>
          <LinearGradient
            colors={item.gradientColors}
            style={styles.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.goalContent}>
              <Text style={styles.accentEmoji}>{item.accentEmoji}</Text>
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.description}>{item.description}</Text>

              <View style={styles.goalGrid}>
                {goalOptions.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.goalCard,
                      dailyTarget === option.value && styles.goalCardSelected,
                    ]}
                    onPress={() => setDailyTarget(option.value)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.goalEmoji}>{option.emoji}</Text>
                    <Text
                      style={[
                        styles.goalValue,
                        dailyTarget === option.value && styles.goalValueSelected,
                      ]}
                    >
                      {option.label}
                    </Text>
                    <Text
                      style={[
                        styles.goalSubtitle,
                        dailyTarget === option.value &&
                          styles.goalSubtitleSelected,
                      ]}
                    >
                      {option.subtitle}
                    </Text>
                    {dailyTarget === option.value && (
                      <View style={styles.checkBadge}>
                        <Ionicons name='checkmark' size={14} color='#FFF' />
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </LinearGradient>
        </View>
      );
    }

    return (
      <View style={styles.slideContainer}>
        <LinearGradient
          colors={item.gradientColors}
          style={styles.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.slideContent}>
            <View style={styles.emojiContainer}>
              <Text style={styles.accentEmoji}>{item.accentEmoji}</Text>
            </View>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.description}>{item.description}</Text>
          </View>

          {/* Decorative circles */}
          <View style={[styles.decorCircle, styles.decorCircle1]} />
          <View style={[styles.decorCircle, styles.decorCircle2]} />
          <View style={[styles.decorCircle, styles.decorCircle3]} />
        </LinearGradient>
      </View>
    );
  };

  const currentSlide = slides[currentIndex];

  return (
    <View style={styles.container}>
      {/* Slides */}
      <Animated.FlatList
        ref={flatListRef}
        data={slides}
        renderItem={renderSlide}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.id}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{ viewAreaCoveragePercentThreshold: 50 }}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: false }
        )}
        scrollEventThrottle={16}
      />

      {/* Overlay UI */}
      <SafeAreaView style={styles.overlay} pointerEvents='box-none'>
        {/* Skip Button */}
        <View style={styles.header}>
          {currentIndex < slides.length - 1 ? (
            <TouchableOpacity onPress={handleSkip} style={styles.skipButton}>
              <Text style={styles.skipText}>Skip</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.skipButton} />
          )}
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          {/* Progress Dots */}
          <View style={styles.dotsContainer}>
            {slides.map((_, index) => {
              const inputRange = [
                (index - 1) * width,
                index * width,
                (index + 1) * width,
              ];

              const dotWidth = scrollX.interpolate({
                inputRange,
                outputRange: [8, 24, 8],
                extrapolate: 'clamp',
              });

              const opacity = scrollX.interpolate({
                inputRange,
                outputRange: [0.4, 1, 0.4],
                extrapolate: 'clamp',
              });

              return (
                <Animated.View
                  key={index}
                  style={[
                    styles.dot,
                    {
                      width: dotWidth,
                      opacity,
                    },
                  ]}
                />
              );
            })}
          </View>

          {/* Next/Finish Button */}
          <TouchableOpacity
            style={styles.nextButton}
            onPress={handleNext}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={['rgba(255,255,255,0.95)', 'rgba(255,255,255,0.85)']}
              style={styles.nextButtonGradient}
            >
              {currentIndex === slides.length - 1 ? (
                <Text style={[styles.buttonText, { color: currentSlide.gradientColors[0] }]}>
                  Start Training
                </Text>
              ) : (
                <View style={styles.nextButtonContent}>
                  <Text style={[styles.buttonText, { color: currentSlide.gradientColors[0] }]}>
                    Continue
                  </Text>
                  <Ionicons
                    name='arrow-forward'
                    size={20}
                    color={currentSlide.gradientColors[0]}
                  />
                </View>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  slideContainer: {
    width,
    height,
  },
  gradient: {
    flex: 1,
    overflow: 'hidden',
  },
  slideContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingBottom: 160,
  },
  goalContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 160,
  },
  emojiContainer: {
    marginBottom: 32,
  },
  accentEmoji: {
    fontSize: 72,
    marginBottom: 24,
  },
  title: {
    fontSize: 42,
    fontWeight: '800',
    color: '#FFF',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 48,
    letterSpacing: -1,
  },
  description: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    lineHeight: 28,
    fontWeight: '500',
    maxWidth: 320,
  },

  // Decorative circles
  decorCircle: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  decorCircle1: {
    width: 300,
    height: 300,
    top: -100,
    right: -100,
  },
  decorCircle2: {
    width: 200,
    height: 200,
    bottom: 100,
    left: -80,
  },
  decorCircle3: {
    width: 150,
    height: 150,
    top: '40%',
    right: -50,
  },

  // Overlay
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 8,
    alignItems: 'flex-end',
  },
  skipButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  skipText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '600',
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 32,
    gap: 24,
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFF',
  },
  nextButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  nextButtonGradient: {
    paddingVertical: 18,
    paddingHorizontal: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.5,
  },

  // Goal Selection
  goalGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
    marginTop: 32,
    width: '100%',
    maxWidth: 340,
  },
  goalCard: {
    width: '47%',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 20,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  goalCardSelected: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderColor: '#FFF',
  },
  goalEmoji: {
    fontSize: 28,
    marginBottom: 8,
  },
  goalValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFF',
    marginBottom: 4,
  },
  goalValueSelected: {
    color: '#4A00E0',
  },
  goalSubtitle: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.8)',
  },
  goalSubtitleSelected: {
    color: '#666',
  },
  checkBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#4A00E0',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
