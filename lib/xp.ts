// lib/xp.ts

export function getLevelFromXp(totalXp: number) {
  const levelThresholds = [
    0,       // Level 1
    300,     // Level 2
    700,     // Level 3
    1200,    // Level 4
    1800,    // Level 5
    2500,    // Level 6
    3400,    // Level 7
    4600,    // Level 8
    6000,    // Level 9
    7700,    // Level 10
    9700,    // Level 11
    12200,   // Level 12
    15200,   // Level 13
    18700,   // Level 14
    22700,   // Level 15
    27700,   // Level 16
    33700,   // Level 17
    40700,   // Level 18
    48700,   // Level 19
    57700,   // Level 20
    68200,   // Level 21
    79000,   // Level 22
    90100,   // Level 23
    101500,  // Level 24
    113200,  // Level 25
    125200,  // Level 26
    137500,  // Level 27
    150000,  // Level 28
    162800,  // Level 29
    175900,  // Level 30
    189300,  // Level 31
    203000,  // Level 32
    217000,  // Level 33
    231300,  // Level 34
    245900,  // Level 35
    260800,  // Level 36
    276000,  // Level 37
    291500,  // Level 38
    307300,  // Level 39
    323300,  // Level 40
    339600,  // Level 41
    356200,  // Level 42
    373100,  // Level 43
    390300,  // Level 44
    407800,  // Level 45
    425600,  // Level 46
    443700,  // Level 47
    462100,  // Level 48
    480800,  // Level 49
    500000,  // Level 50
  ];

  let level = 1;
  for (let i = levelThresholds.length - 1; i >= 0; i--) {
    if (totalXp >= levelThresholds[i]) {
      level = i + 1;
      break;
    }
  }

  level = Math.min(level, 50);

  const currentLevelThreshold = levelThresholds[level - 1];
  const nextLevelThreshold = levelThresholds[level] ?? currentLevelThreshold + 20000;

  const xpIntoLevel = totalXp - currentLevelThreshold;
  const xpForNextLevel = nextLevelThreshold - currentLevelThreshold;

  return { level, xpIntoLevel, xpForNextLevel };
}

export function getRankName(level: number): string {
  if (level <= 5) return 'Grassroots';
  if (level <= 10) return 'Club Player';
  if (level <= 15) return 'Academy Player';
  if (level <= 20) return 'First Team Prospect';
  if (level <= 25) return 'Playmaker';
  if (level <= 30) return 'Elite';
  if (level <= 35) return 'Master Touch';
  if (level <= 40) return 'Professional';
  if (level <= 45) return 'World Class';
  return 'Legend';
}

export function getRankBadge(rank: string) {
  switch (rank) {
    case 'Grassroots':
      return { color: '#22c55e', icon: 'leaf-outline' };
    case 'Club Player':
      return { color: '#3b82f6', icon: 'shield-half-outline' };
    case 'Academy Player':
      return { color: '#a855f7', icon: 'school-outline' };
    case 'First Team Prospect':
      return { color: '#f97316', icon: 'flash-outline' };
    case 'Playmaker':
      return { color: '#facc15', icon: 'star-outline' };
    case 'Elite':
      return { color: '#06b6d4', icon: 'ribbon-outline' };
    case 'Master Touch':
      return { color: '#e5e7eb', icon: 'trophy-outline' };
    case 'Professional':
      return { color: '#f59e0b', icon: 'medal-outline' };
    case 'World Class':
      return { color: '#ec4899', icon: 'planet-outline' };
    case 'Legend':
      return { color: '#38bdf8', icon: 'diamond-outline' };
    default:
      return { color: '#6b7280', icon: 'help-outline' };
  }
}
