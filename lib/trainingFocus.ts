export type FocusKey = 'ball_mastery' | 'turning' | 'one_v_one' | 'juggling' | 'dribbling' | 'free_play';

export interface TrainingFocusCategory {
  key: FocusKey;
  label: string;
  description: string;
  drills: string[];
}

export const TRAINING_FOCUS_CATEGORIES: TrainingFocusCategory[] = [
  {
    key: 'ball_mastery',
    label: 'Ball Mastery',
    description: 'Improve comfort and confidence on the ball.',
    drills: [],
  },
  {
    key: 'turning',
    label: 'Turning',
    description: 'Learn to change direction and escape pressure.',
    drills: [],
  },
  {
    key: 'one_v_one',
    label: '1v1 Skills',
    description: 'Develop creativity and confidence when attacking defenders.',
    drills: [],
  },
  {
    key: 'juggling',
    label: 'Juggling',
    description: 'Improve coordination, balance, and touch sensitivity.',
    drills: [],
  },
  {
    key: 'dribbling',
    label: 'Dribbling',
    description: 'Improve close control while moving with the ball.',
    drills: [],
  },
  {
    key: 'free_play',
    label: 'Free Play',
    description: 'Any training session that fits your mood today.',
    drills: [],
  },
];

// Sunday=0, Monday=1, ..., Saturday=6
const DAY_ROTATION: Record<number, FocusKey> = {
  0: 'free_play',
  1: 'ball_mastery',
  2: 'turning',
  3: 'juggling',
  4: 'one_v_one',
  5: 'dribbling',
  6: 'free_play',
};

// Saturday gets "Player Choice" label rather than "Free Play"
const DAY_LABEL_OVERRIDE: Partial<Record<number, string>> = {
  6: 'Player Choice',
};

export interface TodayFocus extends TrainingFocusCategory {
  displayLabel: string;
}

export function getTodayFocus(): TodayFocus {
  const day = new Date().getDay();
  const key = DAY_ROTATION[day];
  const category = TRAINING_FOCUS_CATEGORIES.find((c) => c.key === key) ?? TRAINING_FOCUS_CATEGORIES[5];
  return {
    ...category,
    displayLabel: DAY_LABEL_OVERRIDE[day] ?? category.label,
  };
}

export function getFocusByKey(key: FocusKey): TrainingFocusCategory {
  return TRAINING_FOCUS_CATEGORIES.find((c) => c.key === key) ?? TRAINING_FOCUS_CATEGORIES[5];
}

export const FOCUS_LABELS: Record<FocusKey, string> = {
  ball_mastery: 'Ball Mastery',
  turning: 'Turning',
  one_v_one: '1v1 Skills',
  juggling: 'Juggling',
  dribbling: 'Dribbling',
  free_play: 'Free Play',
};
