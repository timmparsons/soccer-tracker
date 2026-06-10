import { createFeedEvent } from '@/lib/feedEvents';
import { supabase } from '@/lib/supabase';

const TIER_ORDER = ['bronze', 'silver', 'gold', 'master'] as const;
type Tier = (typeof TIER_ORDER)[number];

export async function checkAndAwardDrillTiers(
  userId: string,
  drillId: string,
  drillName: string,
  touchesTarget: number,
  newPbSeconds: number,
  teamId: string | null | undefined,
): Promise<void> {
  const allBadgeIds = TIER_ORDER.map((t) => `drill_${t}_${drillId}`);

  const [{ data: tiers }, { data: existing }] = await Promise.all([
    supabase
      .from('drill_tiers')
      .select('tier, threshold_seconds')
      .eq('drill_id', drillId)
      .eq('touches_target', touchesTarget),
    supabase
      .from('user_badges')
      .select('badge_id')
      .eq('user_id', userId)
      .in('badge_id', allBadgeIds),
  ]);

  if (!tiers?.length) return;

  const earnedIds = new Set((existing ?? []).map((r) => r.badge_id));
  const toAward: Tier[] = [];

  for (const { tier, threshold_seconds } of tiers as { tier: Tier; threshold_seconds: number }[]) {
    const badgeId = `drill_${tier}_${drillId}`;
    if (!earnedIds.has(badgeId) && newPbSeconds <= threshold_seconds) {
      toAward.push(tier);
    }
  }

  if (!toAward.length) return;

  await supabase.from('user_badges').insert(
    toAward.map((tier) => ({ user_id: userId, badge_id: `drill_${tier}_${drillId}` })),
  );

  if (teamId) {
    // Post feed event for highest tier earned only
    const highest = toAward.sort((a, b) => TIER_ORDER.indexOf(b) - TIER_ORDER.indexOf(a))[0];
    const label = highest.charAt(0).toUpperCase() + highest.slice(1);
    await createFeedEvent(teamId, userId, 'badge_earned', {
      badge_id: `drill_${highest}_${drillId}`,
      badge_name: `${label} — ${drillName}`,
      drill_id: drillId,
      drill_name: drillName,
    });
  }
}
