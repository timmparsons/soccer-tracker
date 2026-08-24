import { getLocalDate } from '@/utils/getLocalDate';
import { useEffect, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';

// getLocalDate() alone isn't reactive — if the app sits backgrounded (not
// killed) across midnight, nothing forces a re-render to recompute it, so
// date-keyed queries (daily sprint, daily challenge) can stay stuck on
// yesterday's date/content indefinitely. This re-checks on every foreground
// transition and bumps state if the calendar day has actually rolled over.
export const useTodayDate = (): string => {
  const [today, setToday] = useState(getLocalDate());

  useEffect(() => {
    const checkDate = () => {
      const current = getLocalDate();
      setToday((prev) => (prev !== current ? current : prev));
    };

    const subscription = AppState.addEventListener('change', (status: AppStateStatus) => {
      if (status === 'active') checkDate();
    });

    return () => subscription.remove();
  }, []);

  return today;
};
