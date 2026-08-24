const TIERS = [3, 7, 14, 21, 30, 60, 90, 180, 365];

const TIER_LABELS: Record<number, string> = {
  3: 'Building the habit',
  7: 'One week strong',
  14: 'Two weeks in',
  21: "Three weeks — this is who you are now",
  30: 'One month streak',
  60: 'Two months strong',
  90: 'Three months locked in',
  180: 'Half a year strong',
  365: 'One year streak',
};

export interface StreakMilestone {
  target: number;
  previousTarget: number;
  label: string;
  progressPct: number;
  isMaxTier: boolean;
}

export function getStreakMilestone(currentStreak: number): StreakMilestone {
  const streak = Math.max(0, currentStreak);
  const nextTier = TIERS.find((t) => t > streak);

  if (nextTier === undefined) {
    const maxTier = TIERS[TIERS.length - 1];
    return {
      target: maxTier,
      previousTarget: maxTier,
      label: `${streak}-day streak`,
      progressPct: 1,
      isMaxTier: true,
    };
  }

  const idx = TIERS.indexOf(nextTier);
  const previousTarget = idx > 0 ? TIERS[idx - 1] : 0;
  const label = TIER_LABELS[nextTier];
  const span = nextTier - previousTarget;
  const progressPct = span > 0 ? Math.min(1, (streak - previousTarget) / span) : 1;

  return { target: nextTier, previousTarget, label, progressPct, isMaxTier: false };
}
