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

function sessionMessage(name: string, totalTouches: number, sessionCount: number, hasChallenge: boolean): string {
  if (hasChallenge) return pick([
    `${name} completed their challenge of the day`,
    `${name} got their daily challenge done`,
    `${name} knocked out today's challenge`,
    `${name} checked off their challenge of the day`,
  ]);
  if (totalTouches >= 10000) return pick([
    `${name} put in an insane shift — ${totalTouches.toLocaleString()} touches today`,
    `${name} is an absolute machine — ${totalTouches.toLocaleString()} touches today`,
    `${name} is built different — ${totalTouches.toLocaleString()} touches and counting`,
  ]);
  if (totalTouches >= 5000) return pick([
    `${name} is on one — ${totalTouches.toLocaleString()} touches today`,
    `${name} is having a day — ${totalTouches.toLocaleString()} touches logged`,
    `${name} is putting in serious work — ${totalTouches.toLocaleString()} touches today`,
  ]);
  if (totalTouches >= 2000) return pick([
    `${name} has been busy today — ${totalTouches.toLocaleString()} touches`,
    `${name} is clocking up the reps — ${totalTouches.toLocaleString()} touches today`,
    `${name} is making today count — ${totalTouches.toLocaleString()} touches`,
  ]);
  if (totalTouches >= 1000) return pick([
    `${name} hit 1,000 touches today`,
    `${name} crossed the 1,000 touch mark today`,
    `${name} broke 1,000 touches today`,
  ]);
  if (sessionCount >= 3) return pick([
    `${name} keeps coming back — ${sessionCount} sessions today`,
    `${name} has been at it all day — ${sessionCount} sessions logged`,
  ]);
  return pick([
    `${name} put in work today`,
    `${name} showed up today`,
    `${name} is getting their reps in`,
  ]);
}

export function useTeamActivity(teamId: string | undefined, limit = 7) {
  return useQuery({
    queryKey: ['team-activity', teamId, limit, getLocalDate()],
    enabled: !!teamId,
    queryFn: async (): Promise<TeamActivityItem[]> => {
      if (!teamId) return [];

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, name, display_name, avatar_url')
        .eq('team_id', teamId)
        .eq('is_coach', false);

      if (!profiles || profiles.length === 0) return [];

      const profileMap = new Map(profiles.map((p) => [p.id, p]));
      const memberIds = profiles.map((p) => p.id);
      const today = getLocalDate();

      // Fetch today's sessions for all team members
      const { data: sessions } = await supabase
        .from('daily_sessions')
        .select('user_id, touches_logged, drill_id, created_at')
        .in('user_id', memberIds)
        .eq('date', today)
        .order('created_at', { ascending: false });

      // Fetch recent 1v1 wins (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const { data: wins } = await supabase
        .from('player_challenges')
        .select(
          'id, winner_id, challenger_id, challenged_id, challenger_completed_at, challenged_completed_at, created_at',
        )
        .eq('status', 'completed')
        .in('winner_id', memberIds)
        .gte('created_at', sevenDaysAgo.toISOString())
        .order('created_at', { ascending: false })
        .limit(20);

      // Batch-fetch any opponent profiles not already in profileMap
      const opponentIds = [
        ...new Set(
          (wins || []).map((w: { winner_id: string; challenger_id: string; challenged_id: string }) =>
            w.winner_id === w.challenger_id ? w.challenged_id : w.challenger_id,
          ),
        ),
      ].filter((id) => !profileMap.has(id));

      if (opponentIds.length > 0) {
        const { data: opponents } = await supabase
          .from('profiles')
          .select('id, name, display_name, avatar_url')
          .in('id', opponentIds);
        opponents?.forEach((p) => profileMap.set(p.id, p));
      }

      // Aggregate today's sessions per user (one story per person)
      type UserStats = { totalTouches: number; sessionCount: number; hasChallenge: boolean; latestAt: string };
      const userStats = new Map<string, UserStats>();

      for (const s of (sessions || []) as { user_id: string; touches_logged: number; drill_id: string | null; created_at: string }[]) {
        const existing = userStats.get(s.user_id);
        if (existing) {
          existing.totalTouches += s.touches_logged;
          existing.sessionCount += 1;
          if (s.drill_id) existing.hasChallenge = true;
        } else {
          userStats.set(s.user_id, {
            totalTouches: s.touches_logged,
            sessionCount: 1,
            hasChallenge: !!s.drill_id,
            latestAt: s.created_at,
          });
        }
      }

      const items: TeamActivityItem[] = [];
      const usedUsers = new Set<string>();

      // 1v1 wins first (most exciting)
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

      // One story per user from today's sessions
      for (const [userId, stats] of userStats.entries()) {
        if (usedUsers.has(userId)) continue;
        const profile = profileMap.get(userId);
        const name = getDisplayName(profile);

        items.push({
          id: `session-${userId}-${today}`,
          userId,
          name,
          avatarUrl: profile?.avatar_url ?? null,
          message: sessionMessage(name, stats.totalTouches, stats.sessionCount, stats.hasChallenge),
          createdAt: stats.latestAt,
        });
        usedUsers.add(userId);
      }

      return items
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, limit);
    },
  });
}
