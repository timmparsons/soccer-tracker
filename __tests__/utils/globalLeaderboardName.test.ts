import { getGlobalDisplayName } from '@/utils/globalLeaderboardName';

describe('getGlobalDisplayName', () => {
  it('abbreviates last name to initial with a period', () => {
    expect(getGlobalDisplayName('Tim Parsons')).toBe('Tim P.');
  });

  it('uses the last word as the initial when there are multiple names', () => {
    expect(getGlobalDisplayName('Maria del Carmen Lopez')).toBe('Maria L.');
  });

  it('returns just the first name when there is no last name', () => {
    expect(getGlobalDisplayName('Valentina')).toBe('Valentina');
  });

  it('trims leading and trailing whitespace', () => {
    expect(getGlobalDisplayName('  Tim Parsons  ')).toBe('Tim P.');
  });

  it('collapses multiple spaces between words', () => {
    expect(getGlobalDisplayName('Tim   Parsons')).toBe('Tim P.');
  });

  it('handles a single-character first name', () => {
    expect(getGlobalDisplayName('T Parsons')).toBe('T P.');
  });
});
