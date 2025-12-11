import { AllCoachesTips } from '@/types/tips';

export const getRandomCoachTip = (tips: AllCoachesTips): string => {
  const arr = tips.allCoachesTips;
  return arr[Math.floor(Math.random() * arr.length)];
};

export const getRandomDailyChallenge = (challenges: {
  dailyChallenges: string[];
}) => {
  const arr = challenges.dailyChallenges;
  return arr[Math.floor(Math.random() * arr.length)];
};
