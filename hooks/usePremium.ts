import { useQuery } from '@tanstack/react-query';
import { Platform } from 'react-native';
import Purchases from 'react-native-purchases';

// DEV OVERRIDE: set to true to preview Pro UI, false to preview free UI, null for real RC check
const DEV_PREMIUM_OVERRIDE: boolean | null = false;

export function usePremium() {
  const { data, isLoading } = useQuery({
    queryKey: ['customerInfo'],
    enabled: DEV_PREMIUM_OVERRIDE === null,
    queryFn: async () => {
      if (Platform.OS === 'web') return false;
      try {
        const info = await Purchases.getCustomerInfo();
        return typeof info.entitlements.active['pro'] !== 'undefined';
      } catch {
        return false;
      }
    },
    staleTime: 1000 * 60 * 5,
  });

  if (DEV_PREMIUM_OVERRIDE !== null) {
    return { isPremium: DEV_PREMIUM_OVERRIDE, isLoading: false };
  }

  return { isPremium: data ?? false, isLoading };
}
