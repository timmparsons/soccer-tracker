export function computeRankAndDeficit<T extends { id: string }>(
  sortedEntries: T[],
  userId: string | null | undefined,
  metricKey: keyof T,
): { rank: number; deficit: number } | null {
  if (!userId || sortedEntries.length <= 1) return null;
  const index = sortedEntries.findIndex((e) => e.id === userId);
  if (index <= 0) return null;
  const deficit =
    Number(sortedEntries[index - 1][metricKey]) -
    Number(sortedEntries[index][metricKey]);
  return { rank: index + 1, deficit };
}
