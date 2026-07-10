import { getLevelFromXp, getRankName, getRankBadge, LEVEL_THRESHOLDS } from '@/lib/xp';

describe('getLevelFromXp', () => {
  it('returns level 1 at 0 XP', () => {
    const result = getLevelFromXp(0);
    expect(result.level).toBe(1);
    expect(result.xpIntoLevel).toBe(0);
    expect(result.xpForNextLevel).toBe(300);
  });

  it('stays level 1 just below the threshold', () => {
    const result = getLevelFromXp(299);
    expect(result.level).toBe(1);
    expect(result.xpIntoLevel).toBe(299);
  });

  it('promotes to level 2 exactly at threshold', () => {
    const result = getLevelFromXp(300);
    expect(result.level).toBe(2);
    expect(result.xpIntoLevel).toBe(0);
    expect(result.xpForNextLevel).toBe(400); // 700 - 300
  });

  it('calculates xpIntoLevel correctly mid-level', () => {
    const result = getLevelFromXp(500); // level 2, 200 XP in
    expect(result.level).toBe(2);
    expect(result.xpIntoLevel).toBe(200);
    expect(result.xpForNextLevel).toBe(400);
  });

  it('reaches level 50 at max threshold', () => {
    const result = getLevelFromXp(500_000);
    expect(result.level).toBe(50);
    expect(result.xpIntoLevel).toBe(0);
    expect(result.xpForNextLevel).toBe(20_000);
  });

  it('caps at level 50 beyond max XP', () => {
    const result = getLevelFromXp(999_999);
    expect(result.level).toBe(50);
    expect(result.level).toBeLessThanOrEqual(50);
  });

  it('returns level 1 for negative XP (should not happen in prod, but must not crash)', () => {
    const result = getLevelFromXp(-1);
    expect(result.level).toBe(1);
  });

  it('all thresholds produce the correct level number', () => {
    LEVEL_THRESHOLDS.forEach((threshold, index) => {
      const { level } = getLevelFromXp(threshold);
      expect(level).toBe(index + 1);
    });
  });
});

describe('getRankName', () => {
  const cases: [number, string][] = [
    [1, 'Grassroots'],
    [5, 'Grassroots'],
    [6, 'Club Player'],
    [10, 'Club Player'],
    [11, 'Academy Player'],
    [15, 'Academy Player'],
    [16, 'First Team Prospect'],
    [20, 'First Team Prospect'],
    [21, 'Playmaker'],
    [25, 'Playmaker'],
    [26, 'Elite'],
    [30, 'Elite'],
    [31, 'Master Touch'],
    [35, 'Master Touch'],
    [36, 'Professional'],
    [40, 'Professional'],
    [41, 'World Class'],
    [45, 'World Class'],
    [46, 'Legend'],
    [50, 'Legend'],
  ];

  it.each(cases)('level %i → %s', (level, expected) => {
    expect(getRankName(level)).toBe(expected);
  });
});

describe('getRankBadge', () => {
  it('returns correct badge for each rank', () => {
    expect(getRankBadge('Grassroots')).toEqual({ color: '#22c55e', icon: 'leaf-outline' });
    expect(getRankBadge('Club Player')).toEqual({ color: '#3b82f6', icon: 'shield-half-outline' });
    expect(getRankBadge('Academy Player')).toEqual({ color: '#a855f7', icon: 'school-outline' });
    expect(getRankBadge('First Team Prospect')).toEqual({ color: '#f97316', icon: 'flash-outline' });
    expect(getRankBadge('Playmaker')).toEqual({ color: '#facc15', icon: 'star-outline' });
    expect(getRankBadge('Elite')).toEqual({ color: '#06b6d4', icon: 'ribbon-outline' });
    expect(getRankBadge('Master Touch')).toEqual({ color: '#e5e7eb', icon: 'trophy-outline' });
    expect(getRankBadge('Professional')).toEqual({ color: '#f59e0b', icon: 'medal-outline' });
    expect(getRankBadge('World Class')).toEqual({ color: '#ec4899', icon: 'planet-outline' });
    expect(getRankBadge('Legend')).toEqual({ color: '#38bdf8', icon: 'diamond-outline' });
  });

  it('returns fallback badge for unknown rank', () => {
    expect(getRankBadge('Unknown')).toEqual({ color: '#6b7280', icon: 'help-outline' });
    expect(getRankBadge('')).toEqual({ color: '#6b7280', icon: 'help-outline' });
  });

  it('rank name from getRankName always has a matching badge', () => {
    const levels = [1, 6, 11, 16, 21, 26, 31, 36, 41, 46];
    levels.forEach((level) => {
      const rank = getRankName(level);
      const badge = getRankBadge(rank);
      expect(badge.color).not.toBe('#6b7280'); // should not be the fallback
    });
  });
});
