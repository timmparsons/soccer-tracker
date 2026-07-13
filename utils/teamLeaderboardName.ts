export function getTeamDisplayNames(
  players: { id: string; name: string }[]
): Record<string, string> {
  const unique = [...new Map(players.map((p) => [p.id, p])).values()];
  const firstNameCounts: Record<string, number> = {};
  const parsed = unique.map((p) => {
    const parts = p.name.trim().split(/\s+/);
    const firstName = parts[0] ?? '';
    const lastInitial = parts.length > 1 ? parts[parts.length - 1].charAt(0) : '';
    return { id: p.id, firstName, lastInitial };
  });

  for (const p of parsed) {
    const key = p.firstName.toLowerCase();
    firstNameCounts[key] = (firstNameCounts[key] ?? 0) + 1;
  }

  const names: Record<string, string> = {};
  for (const p of parsed) {
    const isDuplicate = firstNameCounts[p.firstName.toLowerCase()] > 1;
    names[p.id] =
      isDuplicate && p.lastInitial ? `${p.firstName} ${p.lastInitial}.` : p.firstName;
  }
  return names;
}
