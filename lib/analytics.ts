import { supabase } from '@/lib/supabase';

// Fire-and-forget usage tracking — must never block or break the calling screen.
export const track = (event: string, properties: Record<string, unknown> = {}) => {
  void (async () => {
    try {
      const { data } = await supabase.auth.getSession();
      const userId = data.session?.user.id;
      if (!userId) return;
      await supabase.from('events').insert({ user_id: userId, event, properties });
    } catch {
      // ignore — analytics failures are invisible by design
    }
  })();
};
