import { getLocalDate } from '@/utils/getLocalDate';

describe('getLocalDate', () => {
  it('formats a date with zero-padded month and day', () => {
    expect(getLocalDate(new Date(2024, 0, 5))).toBe('2024-01-05');
  });

  it('formats December 31 correctly', () => {
    expect(getLocalDate(new Date(2024, 11, 31))).toBe('2024-12-31');
  });

  it('formats mid-year dates correctly', () => {
    expect(getLocalDate(new Date(2023, 5, 15))).toBe('2023-06-15');
  });

  it('does not apply UTC offset — reflects local date of the Date object', () => {
    // This function uses getFullYear/getMonth/getDate (local time), not UTC methods.
    // A date constructed via new Date(y, m, d) always matches exactly.
    const d = new Date(2025, 2, 1); // March 1 2025 local
    expect(getLocalDate(d)).toBe('2025-03-01');
  });

  it('returns today when called with no argument', () => {
    const now = new Date();
    const expected = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    expect(getLocalDate()).toBe(expected);
  });
});
