import { getLocalDate } from '@/utils/getLocalDate';

// Deterministic per-day pick, salted by a namespace so independent rotations
// (e.g. which challenge TYPE shows today vs WHICH circuit within that type)
// don't advance in lockstep just because their pool sizes share a common
// factor with a shared linear seed.
export function pickForDate<T>(items: T[], date: Date, namespace: string): T | undefined {
  if (items.length === 0) return undefined;
  const key = `${getLocalDate(date)}:${namespace}`;
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash * 31 + key.charCodeAt(i)) | 0;
  }
  return items[Math.abs(hash) % items.length];
}
