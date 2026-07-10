import { formatTimeAgo } from '@/utils/formatTimeAgo';

const NOW = new Date('2024-06-15T12:00:00.000Z');

beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(NOW);
});

afterEach(() => {
  jest.useRealTimers();
});

function hoursAgo(h: number): string {
  return new Date(NOW.getTime() - h * 60 * 60 * 1000).toISOString();
}

function minutesAgo(m: number): string {
  return new Date(NOW.getTime() - m * 60 * 1000).toISOString();
}

function daysAgo(d: number): string {
  return new Date(NOW.getTime() - d * 24 * 60 * 60 * 1000).toISOString();
}

describe('formatTimeAgo', () => {
  it('returns "Just now" for 0 minutes ago', () => {
    expect(formatTimeAgo(NOW.toISOString())).toBe('Just now');
  });

  it('returns "Just now" for under 1 hour', () => {
    expect(formatTimeAgo(minutesAgo(1))).toBe('Just now');
    expect(formatTimeAgo(minutesAgo(30))).toBe('Just now');
    expect(formatTimeAgo(minutesAgo(59))).toBe('Just now');
  });

  it('returns "1h ago" for exactly 1 hour', () => {
    expect(formatTimeAgo(hoursAgo(1))).toBe('1h ago');
  });

  it('returns hours for 1–23 hours ago', () => {
    expect(formatTimeAgo(hoursAgo(2))).toBe('2h ago');
    expect(formatTimeAgo(hoursAgo(12))).toBe('12h ago');
    expect(formatTimeAgo(hoursAgo(23))).toBe('23h ago');
  });

  it('returns "Yesterday" for exactly 1 day ago', () => {
    expect(formatTimeAgo(daysAgo(1))).toBe('Yesterday');
  });

  it('returns days for 2+ days ago', () => {
    expect(formatTimeAgo(daysAgo(2))).toBe('2 days ago');
    expect(formatTimeAgo(daysAgo(7))).toBe('7 days ago');
    expect(formatTimeAgo(daysAgo(30))).toBe('30 days ago');
  });
});
