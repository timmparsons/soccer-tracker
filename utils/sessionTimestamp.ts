import { getLocalDate } from '@/utils/getLocalDate';

// Backdated sessions have a created_at of "now" but a date in the past, so
// fall back to local midnight of the session date for display/sorting.
export function sessionTimestamp(date: string, createdAt: string): string {
  if (getLocalDate(new Date(createdAt)) === date) return createdAt;
  return new Date(date + 'T00:00:00').toISOString();
}
