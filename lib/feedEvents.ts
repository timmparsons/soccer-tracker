import { supabase } from '@/lib/supabase';

export type FeedEventType =
  | 'personal_best'
  | 'challenge_sent'
  | 'challenge_accepted'
  | 'challenge_won'
  | 'challenge_lost'
  | 'badge_earned'
  | 'weekly_challenge_completed'
  | 'leaderboard_top'
  | 'training_session';

export interface FeedEventPayload {
  drill_id?: string;
  drill_name?: string;
  touches_target?: number;
  time_seconds?: number;
  previous_best?: number;
  opponent_id?: string;
  opponent_name?: string;
  my_time?: number;
  opponent_time?: number;
  badge_id?: string;
  badge_name?: string;
  rank?: number;
  challenge_id?: string;
  touches_count?: number;
  duration_minutes?: number | null;
}

export async function createFeedEvent(
  teamId: string,
  actorId: string,
  eventType: FeedEventType,
  payload: FeedEventPayload,
): Promise<void> {
  await supabase.from('feed_events').insert({
    team_id: teamId,
    actor_id: actorId,
    event_type: eventType,
    payload,
  });
}
