const ADJECTIVES = [
  'Swift', 'Bold', 'Iron', 'Steel', 'Sharp', 'Brave', 'Quick', 'Wild',
  'Storm', 'Silver', 'Golden', 'Flash', 'Fierce', 'Phantom', 'Rocket',
  'Turbo', 'Shadow', 'Blaze', 'Frost', 'Thunder', 'Crimson', 'Stealth',
  'Rapid', 'Venom', 'Apex',
];

const NOUNS = [
  'Eagle', 'Wolf', 'Tiger', 'Fox', 'Hawk', 'Lion', 'Bear', 'Falcon',
  'Cobra', 'Panther', 'Lynx', 'Jaguar', 'Puma', 'Viper', 'Shark',
  'Rhino', 'Cheetah', 'Raven', 'Phoenix', 'Dragon', 'Stallion', 'Mamba',
  'Hornet', 'Bullet', 'Striker',
];

function simpleHash(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

export function getAnonymousName(userId: string): string {
  const hash = simpleHash(userId);
  const adj = ADJECTIVES[hash % ADJECTIVES.length];
  const noun = NOUNS[Math.floor(hash / ADJECTIVES.length) % NOUNS.length];
  return `${adj} ${noun}`;
}
