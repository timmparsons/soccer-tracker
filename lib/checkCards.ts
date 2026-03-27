import { supabase } from '@/lib/supabase';

export interface TradingCard {
  id: string;
  player_name: string;
  nationality: string;
  flag_emoji: string;
  position: 'FWD' | 'MID' | 'DEF' | 'GK';
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  sort_order: number;
  milestone_touches: number | null;
  overall: number;
  pace: number;
  shooting: number;
  passing: number;
  dribbling: number;
  defending: number;
  physical: number;
}

export interface CardCheckContext {
  totalTouches: number;    // cumulative lifetime AFTER this session
  sessionTouches: number;  // touches logged in THIS session only
}

export interface EarnedCard {
  card: TradingCard;
  source: 'milestone' | 'drop';
}

const RARITY_WEIGHTS = {
  common: 60,
  rare: 30,
  epic: 8,
  legendary: 2,
} as const;

function pickWeightedRarity(pool: TradingCard[]): TradingCard | null {
  if (pool.length === 0) return null;

  const rarities = Object.keys(RARITY_WEIGHTS) as Array<keyof typeof RARITY_WEIGHTS>;

  // Build eligible rarities from pool
  const poolRarities = new Set(pool.map((c) => c.rarity));
  const eligible = rarities.filter((r) => poolRarities.has(r));
  if (eligible.length === 0) return null;

  const totalWeight = eligible.reduce((sum, r) => sum + RARITY_WEIGHTS[r], 0);
  let roll = Math.random() * totalWeight;

  let chosenRarity: TradingCard['rarity'] = eligible[0];
  for (const r of eligible) {
    roll -= RARITY_WEIGHTS[r];
    if (roll <= 0) {
      chosenRarity = r;
      break;
    }
  }

  const byRarity = pool.filter((c) => c.rarity === chosenRarity);
  return byRarity[Math.floor(Math.random() * byRarity.length)];
}

// Silent backfill — awards all past milestone cards without triggering a reveal modal.
// Call this from the profile page on load (same pattern as badge backfill).
export async function backfillMilestoneCards(
  userId: string,
  totalTouches: number,
): Promise<void> {
  const { data: allCards } = await supabase.from('trading_cards').select('*');
  if (!allCards || allCards.length === 0) return;

  const { data: ownedRows } = await supabase
    .from('user_cards')
    .select('card_id, source')
    .eq('user_id', userId);

  const ownedMilestoneIds = new Set(
    (ownedRows ?? []).filter((r) => r.source === 'milestone').map((r) => r.card_id),
  );

  const toAward = allCards.filter(
    (c) =>
      c.milestone_touches !== null &&
      totalTouches >= c.milestone_touches &&
      !ownedMilestoneIds.has(c.id),
  );

  if (toAward.length === 0) return;

  await supabase.from('user_cards').insert(
    toAward.map((card) => ({ user_id: userId, card_id: card.id, source: 'milestone' })),
  );
}

export async function checkAndAwardCards(
  userId: string,
  context: CardCheckContext,
): Promise<EarnedCard[]> {
  // Fetch all card definitions
  const { data: allCards } = await supabase
    .from('trading_cards')
    .select('*')
    .order('sort_order');

  if (!allCards || allCards.length === 0) return [];

  // Fetch cards user already owns
  const { data: ownedRows } = await supabase
    .from('user_cards')
    .select('card_id, source')
    .eq('user_id', userId);

  const ownedMilestoneIds = new Set(
    (ownedRows ?? []).filter((r) => r.source === 'milestone').map((r) => r.card_id),
  );
  const ownedUniqueIds = new Set((ownedRows ?? []).map((r) => r.card_id));

  const toAward: EarnedCard[] = [];

  // MILESTONE CHECK — only award milestones crossed IN THIS session
  const preTouches = context.totalTouches - context.sessionTouches;
  for (const card of allCards) {
    if (
      card.milestone_touches !== null &&
      context.totalTouches >= card.milestone_touches &&
      preTouches < card.milestone_touches &&
      !ownedMilestoneIds.has(card.id)
    ) {
      toAward.push({ card, source: 'milestone' });
      ownedUniqueIds.add(card.id); // prevent same card being picked as drop too
    }
  }

  // RANDOM DROP CHECK
  const { sessionTouches } = context;
  let dropChance = 0;
  let eligibleRarities: TradingCard['rarity'][] = [];

  if (sessionTouches >= 1000) {
    dropChance = 0.5;
    eligibleRarities = ['common', 'rare', 'epic', 'legendary'];
  } else if (sessionTouches >= 500) {
    dropChance = 0.35;
    eligibleRarities = ['common', 'rare', 'epic'];
  } else if (sessionTouches >= 100) {
    dropChance = 0.2;
    eligibleRarities = ['common', 'rare'];
  } else if (sessionTouches > 0) {
    dropChance = 0.1;
    eligibleRarities = ['common'];
  }

  if (dropChance > 0 && Math.random() < dropChance) {
    const dropPool = allCards.filter((c) => eligibleRarities.includes(c.rarity));

    const dropped = pickWeightedRarity(dropPool);
    if (dropped) {
      toAward.push({ card: dropped, source: 'drop' });
    }
  }

  if (toAward.length === 0) return [];

  const { error } = await supabase.from('user_cards').insert(
    toAward.map(({ card, source }) => ({
      user_id: userId,
      card_id: card.id,
      source,
    })),
  );

  if (error) {
    console.error('Error awarding cards:', error);
    return [];
  }

  return toAward;
}
