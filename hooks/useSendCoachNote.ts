import { supabase } from '@/lib/supabase';
import { useMutation } from '@tanstack/react-query';

export function useSendCoachNote() {
  return useMutation({
    mutationFn: async ({
      playerPushToken,
      message,
    }: {
      playerId: string;
      playerPushToken?: string | null;
      message: string;
    }) => {
      if (!playerPushToken) {
        throw new Error("This player hasn't enabled notifications yet, so they can't receive a note.");
      }

      const { error } = await supabase.functions.invoke('send-push', {
        body: { to: playerPushToken, title: '💬 Note from Coach', body: message },
      });
      if (error) throw error;
    },
  });
}
