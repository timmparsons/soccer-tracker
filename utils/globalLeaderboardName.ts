export function getGlobalDisplayName(
  name: string,
  city?: string | null,
  state?: string | null,
): string {
  const parts = name.trim().split(/\s+/);
  const firstName = parts[0] ?? '';
  const lastInitial =
    parts.length > 1 ? `${parts[parts.length - 1].charAt(0)}.` : '';
  const shortName = lastInitial ? `${firstName} ${lastInitial}` : firstName;

  if (city && state) return `${shortName} — ${city}, ${state}`;
  if (city) return `${shortName} — ${city}`;
  return shortName;
}
