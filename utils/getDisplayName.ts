export function getDisplayName(
  profile?: {
    display_name?: string | null;
    name?: string | null;
  },
  fallback = 'Champion'
) {
  if (profile?.display_name?.trim()) return profile.display_name;
  // Check name field and extract first name if it contains a space
  if (profile?.name?.trim()) {
    const firstName = profile.name.split(' ')[0];
    return firstName;
  }
  return fallback;
}
