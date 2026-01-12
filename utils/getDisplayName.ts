export function getDisplayName(
  profile?: {
    display_name?: string | null;
    first_name?: string | null;
  },
  fallback = 'Champion'
) {
  if (profile?.display_name?.trim()) return profile.display_name;
  if (profile?.first_name?.trim()) return profile.first_name;
  return fallback;
}
