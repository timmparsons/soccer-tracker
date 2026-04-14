import { useProfile } from '@/hooks/useProfile';
import { useUser } from '@/hooks/useUser';
import { useQuery } from '@tanstack/react-query';
import { Platform } from 'react-native';
import Purchases from 'react-native-purchases';

// DEV OVERRIDES: set to true/false to preview UI, null for real RevenueCat check
const DEV_PRO_OVERRIDE: boolean | null = null;
const DEV_COACH_OVERRIDE: boolean | null = null;

export function useSubscription() {
  const { data: user } = useUser();
  const { data: profile } = useProfile(user?.id);

  const { data, isLoading } = useQuery({
    queryKey: ['customerInfo'],
    enabled: DEV_PRO_OVERRIDE === null && DEV_COACH_OVERRIDE === null,
    queryFn: async () => {
      if (Platform.OS === 'web') return { isPro: false, isCoach: false };
      try {
        const info = await Purchases.getCustomerInfo();
        return {
          isPro: typeof info.entitlements.active['pro'] !== 'undefined',
          isCoach: typeof info.entitlements.active['coach'] !== 'undefined',
        };
      } catch {
        return { isPro: false, isCoach: false };
      }
    },
    staleTime: 1000 * 60 * 5,
  });

  if (DEV_PRO_OVERRIDE !== null || DEV_COACH_OVERRIDE !== null) {
    const isCoach = DEV_COACH_OVERRIDE ?? false;
    const isPremium = isCoach || (DEV_PRO_OVERRIDE ?? false);
    return { isPremium, isCoach, isLoading: false };
  }

  // is_premium in Supabase profile acts as a grandfather/manual override
  const grandfathered = profile?.is_premium === true;
  const isCoach = data?.isCoach ?? false;
  const isPremium = grandfathered || isCoach || (data?.isPro ?? false);

  return { isPremium, isCoach, isLoading };
}
