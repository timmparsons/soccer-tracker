import { supabase } from '@/lib/supabase';
import { getXpForEvent, XpEventType } from './xp';

export async function awardXp(userId: string, event: XpEventType) {
  const amount = getXpForEvent(event);

  if (amount <= 0) return;

  // 1) Get current XP
  const { data: profile, error: fetchError } = await supabase
    .from('profiles')
    .select('total_xp')
    .eq('id', userId)
    .single();

  if (fetchError || !profile) {
    console.error('Error fetching profile for XP:', fetchError);
    return;
  }

  const newTotalXp = (profile.total_xp ?? 0) + amount;

  // 2) Update XP
  const { error: updateError } = await supabase
    .from('profiles')
    .update({ total_xp: newTotalXp })
    .eq('id', userId);

  if (updateError) {
    console.error('Error updating XP:', updateError);
  }
}
