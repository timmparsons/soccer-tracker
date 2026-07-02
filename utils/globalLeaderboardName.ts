export function getGlobalDisplayName(name: string): string {
  const parts = name.trim().split(/\s+/);
  const firstName = parts[0] ?? '';
  const lastInitial =
    parts.length > 1 ? `${parts[parts.length - 1].charAt(0)}.` : '';
  return lastInitial ? `${firstName} ${lastInitial}` : firstName;
}
