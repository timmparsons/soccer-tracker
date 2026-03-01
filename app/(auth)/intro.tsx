import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  FlatList,
  Image,
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
  isVinnieSlide?: boolean;
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
    id: '6',
    title: 'Meet Coach\nVinnie',
    description:
      "Your personal soccer coach. He'll keep you on track, celebrate your wins, and won't let you skip a session without a fight.",
    icon: 'football',
    gradientColors: ['#11998e', '#1a1a2e', '#11998e'],
    accentEmoji: '⚽',
    isVinnieSlide: true,
  },
];

export default function IntroScreen() {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList<Slide>>(null);
  const scrollX = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Mark as seen immediately so a crash/force-quit doesn't loop the intro
    AsyncStorage.setItem('hasSeenIntro', 'true');
  }, []);

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
      router.replace('/(auth)');
    }
  };

  const handleSkip = () => {
    router.replace('/(auth)');
  };

  const renderSlide = ({ item }: { item: Slide }) => {
    if (item.isVinnieSlide) {
      return (
        <View style={styles.slideContainer}>
          <LinearGradient
            colors={item.gradientColors}
            style={styles.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.vinnieSlideContent}>
              <Text style={styles.title}>{item.title}</Text>
              <Image
                source={require('@/assets/images/vinnie.png')}
                style={styles.vinnieSlideImage}
                resizeMode='contain'
              />
              <Text style={styles.description}>{item.description}</Text>
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

          {/* Next/Get Started Button */}
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
                  Get Started
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
  vinnieSlideContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingBottom: 160,
    gap: 24,
  },
  vinnieSlideImage: {
    width: 300,
    height: 194,
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
});
