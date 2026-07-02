import { supabase } from '@/lib/supabase';

export function sendPush(token: string, title: string, body: string) {
  supabase.functions
    .invoke('send-push', { body: { to: token, title, body } })
    .catch(() => {});
}
