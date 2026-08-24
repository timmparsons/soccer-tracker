import { supabase } from '@/lib/supabase';
import { DAILY_SPRINT_ROSTER_COMPLETE, pickSquadBadgeForDate } from '@/lib/squadBadges';

// Awards a Daily Sprint squad badge the moment every player on the roster
// has completed today's sprint. Idempotency (one award per team per day) is
// enforced by checking for an existing row first — client-trusted, same
// approach as the rest of this codebase (see squad_badges_migration.sql).
export async function checkAndAwardSquadBadge(
  teamId: string,
  today: string,
  completedProfileIds: string[],
  rosterSize: number,
): Promise<void> {
  if (rosterSize === 0 || completedProfileIds.length < rosterSize) return;

  const startOfDay = `${today}T00:00:00`;
  const next = new Date(startOfDay);
  next.setDate(next.getDate() + 1);
  const endOfDay = `${next.toISOString().slice(0, 10)}T00:00:00`;

  const { data: existing } = await (supabase as any)
    .from('squad_badges')
    .select('id')
    .eq('team_id', teamId)
    .eq('goal_type', DAILY_SPRINT_ROSTER_COMPLETE)
    .gte('achieved_at', startOfDay)
    .lt('achieved_at', endOfDay)
    .maybeSingle();

  if (existing) return;

  const design = pickSquadBadgeForDate(today);

  const { data: inserted, error } = await (supabase as any)
    .from('squad_badges')
    .insert({
      team_id: teamId,
      badge_name: design.name,
      badge_icon: design.icon,
      goal_type: DAILY_SPRINT_ROSTER_COMPLETE,
      target_count: rosterSize,
    })
    .select('id')
    .single();

  if (error || !inserted) {
    console.error('Error awarding squad badge:', error);
    return;
  }

  const { error: junctionError } = await (supabase as any)
    .from('user_squad_badges')
    .insert(completedProfileIds.map((profile_id) => ({ squad_badge_id: inserted.id, profile_id })));

  if (junctionError) console.error('Error linking squad badge contributors:', junctionError);
}
