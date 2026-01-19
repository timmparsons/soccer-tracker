import { useUser } from '@/hooks/useUser';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import {
  Dimensions,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewToken,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

const slides = [
  {
    id: '1',
    title: 'Welcome to Master Touch!',
    description:
      'Learn to juggle like a pro! Track your progress and watch yourself improve every day.',
    emoji: '⚽',
    color: '#2B9FFF',
  },
  {
    id: '2',
    title: 'Beat Your Best Score',
    description:
      'Every session is a chance to break your record. See how many juggles you can do!',
    emoji: '🏆',
    color: '#FFA500',
  },
  {
    id: '3',
    title: 'Daily Challenges',
    description:
      'Get a new challenge from your coach every day. Complete them to level up and earn XP!',
    emoji: '🔥',
    color: '#2C3E50',
  },
  {
    id: '4',
    title: 'Ready to Start?',
    description:
      "Let's get juggling! Hit the button below to start your journey to becoming a Master Touch champion.",
    emoji: '🚀',
    color: '#1E90FF',
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const { data: user } = useUser();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

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
    await supabase
      .from('profiles')
      .update({ onboarding_completed: true })
      .eq('id', user.id);

    router.replace('/(tabs)');
  };

  const renderSlide = ({ item }: { item: (typeof slides)[0] }) => (
    <View style={[styles.slide, { backgroundColor: item.color }]}>
      <View style={styles.emojiCircle}>
        <Text style={styles.emoji}>{item.emoji}</Text>
      </View>
      <Text style={styles.title}>{item.title}</Text>
      <Text style={styles.description}>{item.description}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Skip Button */}
      <View style={styles.skipContainer}>
        {currentIndex < slides.length - 1 && (
          <TouchableOpacity onPress={handleSkip} style={styles.skipButton}>
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Slides */}
      <FlatList
        ref={flatListRef}
        data={slides}
        renderItem={renderSlide}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.id}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{ viewAreaCoveragePercentThreshold: 50 }}
      />

      {/* Footer with Dots and Button */}
      <View style={styles.footer}>
        {/* Dots */}
        <View style={styles.dotsContainer}>
          {slides.map((_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                index === currentIndex ? styles.activeDot : styles.inactiveDot,
              ]}
            />
          ))}
        </View>

        {/* Next/Finish Button */}
        <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
          {currentIndex === slides.length - 1 ? (
            <Text style={styles.buttonText}>START JUGGLING!</Text>
          ) : (
            <>
              <Text style={styles.buttonText}>NEXT</Text>
              <Ionicons name='arrow-forward' size={20} color='#FFF' />
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F9FF',
  },
  skipContainer: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    alignItems: 'flex-end',
  },
  skipButton: {
    padding: 10,
  },
  skipText: {
    fontSize: 16,
    color: '#2C3E50',
    fontWeight: '700',
  },
  slide: {
    width,
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emojiCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  emoji: {
    fontSize: 80,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: '#FFF',
    textAlign: 'center',
    marginBottom: 20,
  },
  description: {
    fontSize: 17,
    color: '#FFF',
    textAlign: 'center',
    lineHeight: 26,
    fontWeight: '500',
    paddingHorizontal: 10,
  },
  footer: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    paddingTop: 20,
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginHorizontal: 5,
  },
  activeDot: {
    backgroundColor: '#FFA500',
    width: 30,
  },
  inactiveDot: {
    backgroundColor: '#DDD',
  },
  nextButton: {
    backgroundColor: '#FFA500',
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#FFA500',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  buttonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 1,
  },
});
