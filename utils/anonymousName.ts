const ADJECTIVES = [
  'Swift', 'Bold', 'Iron', 'Steel', 'Sharp', 'Brave', 'Quick', 'Wild',
  'Storm', 'Silver', 'Golden', 'Flash', 'Fierce', 'Phantom', 'Rocket',
  'Turbo', 'Shadow', 'Blaze', 'Frost', 'Thunder', 'Crimson', 'Stealth',
  'Rapid', 'Venom', 'Apex', 'Pacy', 'Clinical', 'Elite', 'Prime', 'Clutch',
  'Electric', 'Lethal', 'Dynamic', 'Relentless', 'Ruthless', 'Mighty',
  'Supreme', 'Savage', 'Dominant', 'Blazing', 'Ferocious', 'Technical',
  'Agile', 'Precise', 'Fearless', 'Explosive', 'Unstoppable', 'Legendary',
  'Driven', 'Merciless',
];

const NOUNS = [
  'Eagle', 'Wolf', 'Tiger', 'Fox', 'Hawk', 'Lion', 'Bear', 'Falcon',
  'Cobra', 'Panther', 'Lynx', 'Jaguar', 'Puma', 'Viper', 'Shark',
  'Rhino', 'Cheetah', 'Raven', 'Phoenix', 'Dragon', 'Stallion', 'Mamba',
  'Hornet', 'Bullet', 'Striker', 'Keeper', 'Winger', 'Skipper', 'Maestro',
  'Ace', 'King', 'Legend', 'Warrior', 'Hunter', 'Raider', 'Gladiator',
  'Ninja', 'Knight', 'Titan', 'Ghost', 'Blitz', 'Surge', 'Arrow',
  'Rocket', 'Chief', 'Ranger', 'Blade', 'Comet', 'Raptor', 'Cyclone',
];

// 50 × 50 = 2,500 base combinations.
// A number suffix (1–9) kicks in for the next tier: 22,500 total.
function simpleHash(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

export function getAnonymousName(userId: string): string {
  const hash = simpleHash(userId);
  const totalBase = ADJECTIVES.length * NOUNS.length; // 2500
  const baseIndex = hash % totalBase;
  const adj = ADJECTIVES[baseIndex % ADJECTIVES.length];
  const noun = NOUNS[Math.floor(baseIndex / ADJECTIVES.length) % NOUNS.length];

  // Number suffix tier — activates when hash would otherwise collide past 2500 users
  const tier = Math.floor(hash / totalBase) % 9;
  const suffix = tier > 0 ? ` ${tier + 1}` : '';

  return `${adj} ${noun}${suffix}`;
}
