import { supabase } from '@/lib/supabase';
import { getDisplayName } from '@/utils/getDisplayName';
import { getLocalDate } from '@/utils/getLocalDate';
import { useQuery } from '@tanstack/react-query';

export interface TeamActivityItem {
  id: string;
  userId: string;
  name: string;
  avatarUrl: string | null;
  message: string;
  createdAt: string;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getStreetFeedMessage(category: string, challengeName: string, name: string): string {
  switch (category) {
    case 'freestyle':
      return pick([
        `${name} took on ${challengeName}`,
        `${name} pulled off ${challengeName}`,
        `${name} was feeling it — ${challengeName}`,
      ]);
    case 'accuracy':
      return pick([
        `${name} locked in on ${challengeName}`,
        `${name} put the work in on ${challengeName}`,
        `${name} stepped up to ${challengeName}`,
      ]);
    case 'crazy_control':
      return pick([
        `${name} got uncomfortable — ${challengeName}`,
        `${name} earned it with ${challengeName}`,
        `${name} took on ${challengeName} and felt every rep`,
      ]);
    case 'make_rules':
      return pick([
        `${name} went off — ${challengeName}`,
        `${name} made their own rules: ${challengeName}`,
        `${name} owned the yard with ${challengeName}`,
      ]);
    case 'creativity':
      return pick([
        `${name} built something with ${challengeName}`,
        `${name} got creative — ${challengeName}`,
        `${name} invented something doing ${challengeName}`,
      ]);
    default:
      return `${name} completed ${challengeName}`;
  }
}

function sessionMessage(name: string, totalTouches: number, sessionCount: number, hasChallenge: boolean): string {
  if (hasChallenge) return pick([
    `${name} completed their challenge`,
    `${name} got their challenge done`,
    `${name} knocked out a challenge`,
    `${name} checked off their challenge`,
  ]);
  if (totalTouches >= 10000) return pick([
    `${name} put in an insane shift — ${totalTouches.toLocaleString()} touches`,
    `${name} is an absolute machine — ${totalTouches.toLocaleString()} touches`,
    `${name} is built different — ${totalTouches.toLocaleString()} touches and counting`,
  ]);
  if (totalTouches >= 5000) return pick([
    `${name} is on one — ${totalTouches.toLocaleString()} touches`,
    `${name} is having a day — ${totalTouches.toLocaleString()} touches logged`,
    `${name} is putting in serious work — ${totalTouches.toLocaleString()} touches`,
  ]);
  if (totalTouches >= 2000) return pick([
    `${name} has been busy — ${totalTouches.toLocaleString()} touches`,
    `${name} is clocking up the reps — ${totalTouches.toLocaleString()} touches`,
    `${name} is making it count — ${totalTouches.toLocaleString()} touches`,
  ]);
  if (totalTouches >= 1000) return pick([
    `${name} hit 1,000 touches`,
    `${name} crossed the 1,000 touch mark`,
    `${name} broke 1,000 touches`,
  ]);
  if (sessionCount >= 3) return pick([
    `${name} keeps coming back — ${sessionCount} sessions`,
    `${name} has been at it — ${sessionCount} sessions logged`,
  ]);
  return pick([
    `${name} put in work`,
    `${name} showed up`,
    `${name} is getting their reps in`,
  ]);
}

export function useActivityFeed(limit = 7) {
  return useQuery({
    queryKey: ['activity-feed', limit, getLocalDate()],
    queryFn: async (): Promise<TeamActivityItem[]> => {
      const threeDaysAgoDate = getLocalDate(new Date(Date.now() - 3 * 24 * 60 * 60 * 1000));
      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);

      // Fetch sessions from the past 3 days across all users
      const { data: sessions } = await supabase
        .from('daily_sessions')
        .select('user_id, date, touches_logged, drill_id, created_at')
        .gte('date', threeDaysAgoDate)
        .order('created_at', { ascending: false })
        .limit(200);

      // Fetch recent 1v1 wins globally
      const { data: wins } = await supabase
        .from('player_challenges')
        .select('id, winner_id, challenger_id, challenged_id, challenger_completed_at, challenged_completed_at, created_at')
        .eq('status', 'completed')
        .gte('created_at', threeDaysAgo.toISOString())
        .order('created_at', { ascending: false })
        .limit(20);

      // Fetch recent street challenge completions
      const { data: streetCompletions } = await (supabase as any)
        .from('street_challenge_completions')
        .select('id, profile_id, challenge_id, challenge_name, category, created_at')
        .gte('created_at', threeDaysAgo.toISOString())
        .order('created_at', { ascending: false })
        .limit(30);

      // Collect all user IDs we need profiles for
      const sessionUserIds = [...new Set((sessions || []).map((s: { user_id: string }) => s.user_id))];
      const winnerIds = (wins || []).map((w: { winner_id: string }) => w.winner_id);
      const opponentIds = (wins || []).map((w: { winner_id: string; challenger_id: string; challenged_id: string }) =>
        w.winner_id === w.challenger_id ? w.challenged_id : w.challenger_id,
      );
      const streetUserIds = (streetCompletions || []).map((c: any) => c.profile_id as string);
      const allUserIds = [...new Set([...sessionUserIds, ...winnerIds, ...opponentIds, ...streetUserIds])];

      if (allUserIds.length === 0) return [];

      // Fetch all relevant profiles, excluding coaches
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, name, display_name, avatar_url')
        .in('id', allUserIds)
        .eq('is_coach', false);

      if (!profiles || profiles.length === 0) return [];

      const profileMap = new Map(profiles.map((p) => [p.id, p]));

      // Aggregate sessions per user per day, then pick each user's most recent day
      type DayStats = { totalTouches: number; sessionCount: number; hasChallenge: boolean; latestAt: string };
      const userDayMap = new Map<string, Map<string, DayStats>>();

      for (const s of (sessions || []) as { user_id: string; date: string; touches_logged: number; drill_id: string | null; created_at: string }[]) {
        if (!profileMap.has(s.user_id)) continue;
        if (!userDayMap.has(s.user_id)) userDayMap.set(s.user_id, new Map());
        const dayMap = userDayMap.get(s.user_id)!;
        const existing = dayMap.get(s.date);
        if (existing) {
          existing.totalTouches += s.touches_logged;
          existing.sessionCount += 1;
          if (s.drill_id) existing.hasChallenge = true;
        } else {
          dayMap.set(s.date, { totalTouches: s.touches_logged, sessionCount: 1, hasChallenge: !!s.drill_id, latestAt: s.created_at });
        }
      }

      const userStats = new Map<string, DayStats>();
      for (const [userId, dayMap] of userDayMap.entries()) {
        const [, best] = [...dayMap.entries()].sort((a, b) => b[0].localeCompare(a[0]))[0];
        userStats.set(userId, best);
      }

      const items: TeamActivityItem[] = [];
      const usedUsers = new Set<string>();

      // 1v1 wins first
      for (const w of (wins || []) as {
        id: string;
        winner_id: string;
        challenger_id: string;
        challenged_id: string;
        challenger_completed_at: string | null;
        challenged_completed_at: string | null;
        created_at: string;
      }[]) {
        if (usedUsers.has(w.winner_id)) continue;
        if (!profileMap.has(w.winner_id)) continue;

        const winnerProfile = profileMap.get(w.winner_id);
        const winnerName = getDisplayName(winnerProfile);
        const opponentId = w.winner_id === w.challenger_id ? w.challenged_id : w.challenger_id;
        const opponentName = getDisplayName(profileMap.get(opponentId));
        const completedAt =
          (w.winner_id === w.challenger_id
            ? w.challenger_completed_at
            : w.challenged_completed_at) ?? w.created_at;

        items.push({
          id: `win-${w.id}`,
          userId: w.winner_id,
          name: winnerName,
          avatarUrl: winnerProfile?.avatar_url ?? null,
          message: pick([
            `${winnerName} beat ${opponentName} in a 1v1`,
            `${winnerName} got the better of ${opponentName} today`,
            `${winnerName} took down ${opponentName} in a 1v1`,
          ]),
          createdAt: completedAt,
        });
        usedUsers.add(w.winner_id);
      }

      // One story per user (their most recent training day)
      for (const [userId, stats] of userStats.entries()) {
        if (usedUsers.has(userId)) continue;
        const profile = profileMap.get(userId);
        const name = getDisplayName(profile);

        items.push({
          id: `session-${userId}-${stats.latestAt}`,
          userId,
          name,
          avatarUrl: profile?.avatar_url ?? null,
          message: sessionMessage(name, stats.totalTouches, stats.sessionCount, stats.hasChallenge),
          createdAt: stats.latestAt,
        });
        usedUsers.add(userId);
      }

      // Street challenge completions
      for (const completion of (streetCompletions || []) as any[]) {
        if (usedUsers.has(completion.profile_id)) continue;
        const profile = profileMap.get(completion.profile_id);
        if (!profile) continue;
        const name = getDisplayName(profile);
        items.push({
          id: `street-${completion.id}`,
          userId: completion.profile_id,
          name,
          avatarUrl: profile.avatar_url ?? null,
          message: getStreetFeedMessage(completion.category, completion.challenge_name, name),
          createdAt: completion.created_at,
        });
      }

      return items
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, limit);
    },
  });
}
