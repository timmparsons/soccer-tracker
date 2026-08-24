export const DAILY_SPRINT_ROSTER_COMPLETE = 'daily_sprint_roster_complete';

export interface SquadBadgeDesign {
  name: string;
  icon: string;
  color: string;
}

// Rotating pool of Daily Sprint squad badge designs — picked by date-seeded
// rotation, same approach as pickComboForDate in hooks/useDailySprint.ts, so
// every team sees the same badge name on a given day and it changes daily.
export const SQUAD_BADGE_POOL: SquadBadgeDesign[] = [
  { name: 'Flash Squad Badge', icon: 'flash', color: '#ffb724' },
  { name: 'Thunder Squad Badge', icon: 'thunderstorm', color: '#1f89ee' },
  { name: 'Iron Squad Badge', icon: 'shield', color: '#78909C' },
  { name: 'Rocket Squad Badge', icon: 'rocket', color: '#31af4d' },
  { name: 'Blaze Squad Badge', icon: 'flame', color: '#FF6B4A' },
];

export function pickSquadBadgeForDate(dateStr: string): SquadBadgeDesign {
  const [y, m, d] = dateStr.split('-').map(Number);
  const seed = y * 10000 + m * 100 + d;
  return SQUAD_BADGE_POOL[seed % SQUAD_BADGE_POOL.length];
}
