export type VinnieMood = 'happy' | 'hype' | 'urgent' | 'anxious' | 'firm' | 'encouraging';

export interface VinnieState {
  mood: VinnieMood;
  message: string;
}

export interface VinnieContext {
  trainedToday: boolean;
  streak: number;
  hour: number;
}

const pickRandom = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

const MESSAGES: Record<VinnieMood, string[]> = {
  happy: [
    "That's what I'm talking about! Keep the ball rolling 💪",
    "Good session! Champions build habits, one day at a time.",
    "You showed up today. That's half the battle won.",
    "Nice work. Don't stop there — tomorrow we go again.",
  ],
  hype: [
    "YOU. ARE. ON FIRE. Don't stop now! 🔥",
    "Look at that streak! You're becoming elite! 🏆",
    "Messi didn't get good by sitting on the couch. Keep going!",
    "That's a real footballer right there! Incredible work!",
  ],
  urgent: [
    "Oi! The ball's not gonna kick itself. 5 minutes. Go.",
    "Still no session today? Get your boots on. NOW.",
    "Every top player trained today. What about you?",
    "I'm waiting. The ball is waiting. What's the hold up?",
  ],
  anxious: [
    "Don't you dare break that streak. I'm watching. ⚽",
    "One session. That's all. Don't break the chain!",
    "Your streak is on the line! 5 minutes is all it takes.",
    "I didn't coach you this hard to watch you quit now!",
  ],
  firm: [
    "We don't lose sleep over yesterday. We train harder today.",
    "Streaks break. Champions restart. Get back out there.",
    "Yesterday's gone. Today's session is what counts.",
    "Every great player has had an off week. Today we start over.",
  ],
  encouraging: [
    "Morning! A quick session gets the day started right ⚽",
    "New day, new chance to get better. Let's go!",
    "The best players train before anyone else is awake.",
    "Tap the timer. Five minutes. You'll thank me later.",
  ],
};

export const VINNIE_CELEBRATIONS: string[] = [
  "YESSS! That's how it's done! 🔥",
  "Boom! Another session in the bag! ⚽",
  "That's the work! Keep stacking those sessions! 💪",
  "Champions do exactly what you just did. Proud of you!",
  "No days off! You're getting better every single time.",
  "Now THAT'S a footballer! Keep it up!",
];

export const VINNIE_CHALLENGE_CELEBRATIONS: string[] = [
  "Challenge DONE. That's what sets you apart from the rest.",
  "Look at you completing challenges! That's elite mentality.",
  "NAILED IT! That drill just got a lot easier for you.",
  "Challenge done and dusted. You're building something special.",
  "That's a challenge ticked off! Keep stacking them up.",
  "Most kids skip this. You didn't. That's why you'll be different.",
];

export const VINNIE_STREAK_MILESTONES = [7, 14, 21, 30, 50, 100];

export const VINNIE_CHALLENGE_STREAK_MILESTONES = [3, 7, 14, 21, 30];

export const VINNIE_CHALLENGE_STREAK_MESSAGES: Record<number, string> = {
  3: "3 challenges in a row! You're making this a habit ⚽",
  7: "A whole week of challenges! That's serious dedication 🔥",
  14: "14 challenge days! You're doing the work others won't 💪",
  21: "21 consecutive challenges! That's elite consistency 🏆",
  30: "30 DAYS of challenges! You're built different. Absolute legend 🌟",
};

export const VINNIE_STREAK_MESSAGES: Record<number, string> = {
  7: "A whole week straight! You're building real habits now 🔥",
  14: "Two weeks! Your skills are growing even when you can't see it yet 💪",
  21: "21 days! Science says that's a habit. You're locked in ⚽",
  30: "30 DAYS. One full month. I am so proud of you right now 🏆",
  50: "50 days. FIFTY. You're not just a player — you're an athlete 🌟",
  100: "100 DAYS! That's elite. Absolutely elite. I have no words 🏆🔥",
};

export const MOOD_EMOJI: Record<VinnieMood, string> = {
  happy: '😄',
  hype: '🔥',
  urgent: '😤',
  anxious: '😰',
  firm: '💪',
  encouraging: '⚽',
};

export const getVinnieMood = (ctx: VinnieContext): VinnieState => {
  const { trainedToday, streak, hour } = ctx;

  if (trainedToday) {
    if (streak >= 30) {
      return { mood: 'hype', message: `${streak} days straight! You're absolutely elite! 🏆` };
    }
    if (streak >= 14) {
      return { mood: 'hype', message: `${streak} day streak! You're becoming elite 🔥` };
    }
    if (streak >= 7) {
      return { mood: 'happy', message: `${streak} days in a row! Messi would be proud 🔥` };
    }
    return { mood: 'happy', message: pickRandom(MESSAGES.happy) };
  }

  // Hasn't trained yet
  if (streak > 3 && hour >= 20) {
    return {
      mood: 'anxious',
      message: `Don't break that ${streak}-day streak. I'm watching. ⚽`,
    };
  }
  if (hour >= 19) {
    return { mood: 'urgent', message: pickRandom(MESSAGES.urgent) };
  }
  if (streak === 0) {
    return { mood: 'firm', message: pickRandom(MESSAGES.firm) };
  }
  return { mood: 'encouraging', message: pickRandom(MESSAGES.encouraging) };
};

export const getVinnieCelebration = (): string =>
  pickRandom(VINNIE_CELEBRATIONS);

export const getVinnieChallengeCelebration = (): string =>
  pickRandom(VINNIE_CHALLENGE_CELEBRATIONS);
