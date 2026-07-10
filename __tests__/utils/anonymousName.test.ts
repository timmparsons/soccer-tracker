import { getAnonymousName } from '@/utils/anonymousName';

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

describe('getAnonymousName', () => {
  it('returns a two-word string', () => {
    const name = getAnonymousName('user-123');
    const parts = name.split(' ');
    expect(parts).toHaveLength(2);
  });

  it('first word is always a valid adjective', () => {
    const [adj] = getAnonymousName('user-abc').split(' ');
    expect(ADJECTIVES).toContain(adj);
  });

  it('second word is always a valid noun', () => {
    const [, noun] = getAnonymousName('user-abc').split(' ');
    expect(NOUNS).toContain(noun);
  });

  it('is deterministic — same input always produces same output', () => {
    const id = 'some-uuid-1234';
    expect(getAnonymousName(id)).toBe(getAnonymousName(id));
    expect(getAnonymousName(id)).toBe(getAnonymousName(id));
  });

  it('different user IDs produce different names', () => {
    const a = getAnonymousName('user-001');
    const b = getAnonymousName('user-002');
    // Not guaranteed by design, but almost certain with a hash
    // — if this ever fails it means the hash collided, which is worth knowing
    expect(a).not.toBe(b);
  });

  it('empty string does not crash', () => {
    expect(() => getAnonymousName('')).not.toThrow();
    const name = getAnonymousName('');
    const parts = name.split(' ');
    expect(parts).toHaveLength(2);
    expect(ADJECTIVES).toContain(parts[0]);
    expect(NOUNS).toContain(parts[1]);
  });
});
