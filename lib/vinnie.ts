export type VinnieMood = 'happy' | 'hype' | 'urgent' | 'anxious' | 'firm' | 'encouraging';

export interface VinnieState {
  mood: VinnieMood;
  message: string;
}

export interface VinnieContext {
  trainedToday: boolean;
  streak: number;
  hour: number;
  dayOfWeek?: number; // 0=Sun, 1=Mon, ..., 6=Sat
}

const pickRandom = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

const MESSAGES: Record<VinnieMood, string[]> = {
  happy: [
    "That's what I'm talking about! Keep the ball rolling 💪",
    "Good session! Champions build habits, one day at a time.",
    "You showed up today. That's half the battle won.",
    "Nice work. Don't stop there — tomorrow we go again.",
    "The ball is like a magnet. If you can control it, you can do anything.",
    "You have to fight to reach your dream. Sacrifice and work hard for it.",
    "Every training session is an opportunity to improve. Never waste one.",
    "Work on your weaknesses until they become your strengths.",
  ],
  hype: [
    "YOU. ARE. ON FIRE. Don't stop now! 🔥",
    "Look at that streak! You're becoming elite! 🏆",
    "Messi didn't get good by sitting on the couch. Keep going!",
    "That's a real footballer right there! Incredible work!",
    "Train faster than you play. If you can do it fast in training, it'll be easy in a game.",
    "Aim for 50+ touches per minute. That's game speed. Anything less is warm-up.",
    "In a game, you have 1–2 seconds on the ball. Train like you have even less.",
    "Speed is a skill. The more you practice fast, the more comfortable you'll be under pressure. 🚀",
    "Perfect practice at slow speed is useless. The game is fast — your training should be too.",
    "Ball control is everything. The best players touch the ball 10,000 times a day.",
  ],
  urgent: [
    "Oi! The ball's not gonna kick itself. 5 minutes. Go.",
    "Still no session today? Get your boots on. NOW.",
    "Every top player trained today. What about you?",
    "I'm waiting. The ball is waiting. What's the hold up?",
    "Champions train when nobody is watching. So get going.",
    "You either train to dominate or you train to lose. Which is it?",
    "How much do you want it? That's the only question that matters.",
  ],
  anxious: [
    "Don't you dare break that streak. I'm watching. ⚽",
    "One session. That's all. Don't break the chain!",
    "Your streak is on the line! 5 minutes is all it takes.",
    "I didn't coach you this hard to watch you quit now!",
    "The mental game is won in training, not on match day. Don't skip.",
    "Identity drives behaviour. Decide who you are, then act accordingly.",
  ],
  firm: [
    "We don't lose sleep over yesterday. We train harder today.",
    "Streaks break. Champions restart. Get back out there.",
    "Yesterday's gone. Today's session is what counts.",
    "Every great player has had an off week. Today we start over.",
    "Quality over quantity. 100 focused touches beat 500 sloppy ones.",
    "Consistency over intensity. Show up every day.",
    "Your habits today are your results tomorrow.",
    "Suffering in training means winning in competition.",
    "The difference between winners and losers is attitude, not ability.",
    "Be a fighter. Never a victim.",
    "Mistakes at speed are better than perfection at a snail's pace. Learn from errors, keep pushing.",
  ],
  encouraging: [
    "Morning! A quick session gets the day started right ⚽",
    "New day, new chance to get better. Let's go!",
    "The best players train before anyone else is awake.",
    "Tap the timer. Five minutes. You'll thank me later.",
    "Keep the ball close to your feet. The tighter your control, the harder you are to dispossess.",
    "Use all surfaces of your foot — inside, outside, sole, and laces. Versatility is key.",
    "Practice with your weaker foot as much as your strong foot. Two-footed players are unstoppable.",
    "Cushion the ball on your first touch. A soft touch keeps it close and ready.",
    "Always know where you want to go before the ball arrives. Look up, then receive.",
    "Keep your head up while dribbling. The ball should be felt, not watched.",
    "Change pace and direction suddenly. Unpredictability is your greatest weapon.",
    "Train in short bursts throughout the day. Consistency beats intensity.",
    "Practice under pressure. Add time limits or challenges to simulate game situations.",
    "Keep your knees slightly bent and stay on your toes. Good balance means better control.",
    "Use your body to shield the ball. Get between the defender and the ball.",
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

const MONDAY_MESSAGES: string[] = [
  "New week, new goals! What are you going to achieve this week? ⚽",
  "Monday! The best players start their week with a session. Let's go!",
  "Fresh week, fresh start. Let's make this one count! 🔥",
  "It's Monday — time to set the tone for the whole week. Train now!",
];

export const getVinnieMood = (ctx: VinnieContext): VinnieState => {
  const { trainedToday, streak, hour, dayOfWeek } = ctx;

  // Monday morning recap — special motivator at the start of the week
  if (dayOfWeek === 1 && !trainedToday && hour < 12) {
    return { mood: 'encouraging', message: pickRandom(MONDAY_MESSAGES) };
  }

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
