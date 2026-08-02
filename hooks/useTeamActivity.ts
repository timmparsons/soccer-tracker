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
  isGameSpeed?: boolean;
}

function pickForId<T>(arr: T[], id: string): T {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) & 0x7fffffff;
  }
  return arr[hash % arr.length];
}

function getStreetFeedMessage(category: string, challengeName: string, name: string, id: string): string {
  switch (category) {
    case 'freestyle':
      return pickForId([
        `${name} took on ${challengeName}`,
        `${name} pulled off ${challengeName}`,
        `${name} was feeling it — ${challengeName}`,
      ], id);
    case 'accuracy':
      return pickForId([
        `${name} locked in on ${challengeName}`,
        `${name} put the work in on ${challengeName}`,
        `${name} stepped up to ${challengeName}`,
      ], id);
    case 'crazy_control':
      return pickForId([
        `${name} got uncomfortable — ${challengeName}`,
        `${name} earned it with ${challengeName}`,
        `${name} took on ${challengeName} and felt every rep`,
      ], id);
    case 'make_rules':
      return pickForId([
        `${name} went off — ${challengeName}`,
        `${name} made their own rules: ${challengeName}`,
        `${name} owned the yard with ${challengeName}`,
      ], id);
    case 'creativity':
      return pickForId([
        `${name} built something with ${challengeName}`,
        `${name} got creative — ${challengeName}`,
        `${name} invented something doing ${challengeName}`,
      ], id);
    default:
      return `${name} completed ${challengeName}`;
  }
}

function badgeMessage(name: string, badgeId: string, badgeName: string, badgeDescription: string, id: string): string {
  if (badgeId === 'perf_pb') {
    return pickForId([
      `${name} just broke their juggling record!`,
      `${name} beat their own juggling PB!`,
      `${name} set a new juggling record!`,
    ], id);
  }
  if (badgeId === 'perf_sky_high_bronze' || badgeId === 'perf_sky_high_silver' || badgeId === 'perf_sky_high_gold') {
    return pickForId([
      `${name} is on fire — new juggling PBs 3 days running (${badgeName})`,
      `${name} just earned ${badgeName} — 3 straight days of new juggling records`,
    ], id);
  }
  return pickForId([
    `${name} earned the "${badgeName}" badge — ${badgeDescription}`,
    `${name} just unlocked "${badgeName}"`,
  ], id);
}

function sessionMessage(name: string, totalTouches: number, sessionCount: number, hasChallenge: boolean, id: string): string {
  if (hasChallenge) return pickForId([
    `${name} completed their challenge`,
    `${name} got their challenge done`,
    `${name} knocked out a challenge`,
    `${name} checked off their challenge`,
  ], id);
  if (totalTouches >= 10000) return pickForId([
    `${name} put in an insane shift — ${totalTouches.toLocaleString()} touches`,
    `${name} is an absolute machine — ${totalTouches.toLocaleString()} touches`,
    `${name} is built different — ${totalTouches.toLocaleString()} touches and counting`,
  ], id);
  if (totalTouches >= 5000) return pickForId([
    `${name} is on one — ${totalTouches.toLocaleString()} touches`,
    `${name} is having a day — ${totalTouches.toLocaleString()} touches logged`,
    `${name} is putting in serious work — ${totalTouches.toLocaleString()} touches`,
  ], id);
  if (totalTouches >= 2000) return pickForId([
    `${name} has been busy — ${totalTouches.toLocaleString()} touches`,
    `${name} is clocking up the reps — ${totalTouches.toLocaleString()} touches`,
    `${name} is making it count — ${totalTouches.toLocaleString()} touches`,
  ], id);
  if (totalTouches >= 1000) return pickForId([
    `${name} hit 1,000 touches`,
    `${name} crossed the 1,000 touch mark`,
    `${name} broke 1,000 touches`,
  ], id);
  if (sessionCount >= 3) return pickForId([
    `${name} keeps coming back — ${sessionCount} sessions`,
    `${name} has been at it — ${sessionCount} sessions logged`,
  ], id);
  return pickForId([
    `${name} put in work`,
    `${name} showed up`,
    `${name} is getting their reps in`,
  ], id);
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
        .select('user_id, date, touches_logged, drill_id, juggle_count, created_at, is_game_speed')
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

      // Fetch recently earned badges (streaks, volume, sessions, social,
      // tier unlocks, etc). perf_pb/perf_sky_high_* are excluded from this
      // generic pass — badges only ever fire once (upsert onConflict
      // ignoreDuplicates), so a repeat juggling PB months later wouldn't
      // re-award perf_pb and would silently never show here. The dedicated
      // juggling-record check below re-derives it straight from session
      // data instead, so it fires every time, not just the first ever.
      const JUGGLE_BADGE_IDS = new Set(['perf_pb', 'perf_sky_high_bronze', 'perf_sky_high_silver', 'perf_sky_high_gold']);
      const { data: rawBadgeEarns } = await (supabase as any)
        .from('user_badges')
        .select('id, user_id, badge_id, earned_at, badges(name, description)')
        .gte('earned_at', threeDaysAgo.toISOString())
        .order('earned_at', { ascending: false })
        .limit(30);
      const badgeEarns = (rawBadgeEarns || []).filter((b: any) => !JUGGLE_BADGE_IDS.has(b.badge_id));

      // Fetch recent street challenge completions
      const { data: streetCompletions } = await (supabase as any)
        .from('street_challenge_completions')
        .select('id, profile_id, challenge_id, challenge_name, category, created_at')
        .gte('created_at', threeDaysAgo.toISOString())
        .order('created_at', { ascending: false })
        .limit(30);

      // Fetch recent daily challenge completions
      const { data: dailyChallengeCompletions } = await (supabase as any)
        .from('daily_challenge_completions')
        .select('id, profile_id, challenge_id, time_seconds, created_at, daily_challenges(title)')
        .gte('created_at', threeDaysAgo.toISOString())
        .order('created_at', { ascending: false })
        .limit(30);

      // Fetch recent daily sprint completions
      const { data: sprintCompletions } = await (supabase as any)
        .from('sprint_attempts')
        .select('id, profile_id, combo_id, duration_ms, is_pr, is_crown, created_at')
        .gte('created_at', threeDaysAgo.toISOString())
        .order('created_at', { ascending: false })
        .limit(30);

      const comboIds = [...new Set((sprintCompletions || []).map((c: any) => c.combo_id as string))];
      const { data: sprintCombos } = comboIds.length > 0
        ? await (supabase as any).from('sprint_combos').select('id, name').in('id', comboIds)
        : { data: [] };
      const comboNameMap = new Map((sprintCombos || []).map((c: any) => [c.id, c.name]));

      // Each user's best juggle_count session within the recent window —
      // candidate for a "broke their juggling record" feed event.
      const recentBestJuggle = new Map<string, { value: number; createdAt: string }>();
      for (const s of (sessions || []) as { user_id: string; juggle_count: number | null; created_at: string }[]) {
        if (!s.juggle_count || s.juggle_count <= 0) continue;
        const existing = recentBestJuggle.get(s.user_id);
        if (!existing || s.juggle_count > existing.value) {
          recentBestJuggle.set(s.user_id, { value: s.juggle_count, createdAt: s.created_at });
        }
      }

      // Confirm it's an actual record by checking it beats everything the
      // user logged before that moment (not just the recent window).
      const juggleCandidateIds = [...recentBestJuggle.keys()];
      const priorJuggleMax = new Map<string, number>();
      if (juggleCandidateIds.length > 0) {
        const { data: allJuggleSessions } = await supabase
          .from('daily_sessions')
          .select('user_id, juggle_count, created_at')
          .in('user_id', juggleCandidateIds)
          .not('juggle_count', 'is', null)
          .gt('juggle_count', 0);

        for (const s of (allJuggleSessions || []) as { user_id: string; juggle_count: number; created_at: string }[]) {
          const recent = recentBestJuggle.get(s.user_id)!;
          if (new Date(s.created_at).getTime() >= new Date(recent.createdAt).getTime()) continue;
          const cur = priorJuggleMax.get(s.user_id) ?? 0;
          if (s.juggle_count > cur) priorJuggleMax.set(s.user_id, s.juggle_count);
        }
      }

      // Collect all user IDs we need profiles for
      const sessionUserIds = [...new Set((sessions || []).map((s: { user_id: string }) => s.user_id))];
      const winnerIds = (wins || []).map((w: { winner_id: string }) => w.winner_id);
      const opponentIds = (wins || []).map((w: { winner_id: string; challenger_id: string; challenged_id: string }) =>
        w.winner_id === w.challenger_id ? w.challenged_id : w.challenger_id,
      );
      const streetUserIds = (streetCompletions || []).map((c: any) => c.profile_id as string);
      const dailyChallengeUserIds = (dailyChallengeCompletions || []).map((c: any) => c.profile_id as string);
      const sprintUserIds = (sprintCompletions || []).map((c: any) => c.profile_id as string);
      const badgeUserIds = (badgeEarns || []).map((b: any) => b.user_id as string);
      const allUserIds = [...new Set([...sessionUserIds, ...winnerIds, ...opponentIds, ...streetUserIds, ...dailyChallengeUserIds, ...sprintUserIds, ...badgeUserIds])];

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
      type DayStats = { totalTouches: number; sessionCount: number; hasChallenge: boolean; latestAt: string; isGameSpeed: boolean };
      const userDayMap = new Map<string, Map<string, DayStats>>();

      for (const s of (sessions || []) as { user_id: string; date: string; touches_logged: number; drill_id: string | null; created_at: string; is_game_speed: boolean | null }[]) {
        if (!profileMap.has(s.user_id)) continue;
        if (!userDayMap.has(s.user_id)) userDayMap.set(s.user_id, new Map());
        const dayMap = userDayMap.get(s.user_id)!;
        const existing = dayMap.get(s.date);
        if (existing) {
          existing.totalTouches += s.touches_logged;
          existing.sessionCount += 1;
          if (s.drill_id) existing.hasChallenge = true;
          if (s.is_game_speed) existing.isGameSpeed = true;
        } else {
          dayMap.set(s.date, { totalTouches: s.touches_logged, sessionCount: 1, hasChallenge: !!s.drill_id, latestAt: s.created_at, isGameSpeed: !!s.is_game_speed });
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
          message: pickForId([
            `${winnerName} beat ${opponentName} in a 1v1`,
            `${winnerName} got the better of ${opponentName} today`,
            `${winnerName} took down ${opponentName} in a 1v1`,
          ], w.id),
          createdAt: completedAt,
        });
        usedUsers.add(w.winner_id);
      }

      // Juggling record broken — checked before badge earns/routine
      // completions since it's a standout personal moment.
      for (const [userId, recent] of recentBestJuggle.entries()) {
        if (usedUsers.has(userId)) continue;
        const priorMax = priorJuggleMax.get(userId) ?? 0;
        if (recent.value <= priorMax) continue;
        const profile = profileMap.get(userId);
        if (!profile) continue;
        const name = getDisplayName(profile);
        const dedupeId = `${userId}-${recent.createdAt}`;

        items.push({
          id: `juggle-pb-${dedupeId}`,
          userId,
          name,
          avatarUrl: profile.avatar_url ?? null,
          message: pickForId([
            `${name} just broke their juggling record — ${recent.value} juggles!`,
            `${name} smashed their juggling PB with ${recent.value}!`,
            `${name} set a new juggling record — ${recent.value} juggles`,
          ], dedupeId),
          createdAt: recent.createdAt,
        });
        usedUsers.add(userId);
      }

      // Badge earns (records/milestones) — after 1v1 wins, before routine
      // completions, since these are the rarer/more notable events.
      for (const b of (badgeEarns || []) as {
        id: string;
        user_id: string;
        badge_id: string;
        earned_at: string;
        badges: { name: string; description: string } | null;
      }[]) {
        if (usedUsers.has(b.user_id)) continue;
        const profile = profileMap.get(b.user_id);
        if (!profile || !b.badges) continue;
        const name = getDisplayName(profile);

        items.push({
          id: `badge-${b.id}`,
          userId: b.user_id,
          name,
          avatarUrl: profile.avatar_url ?? null,
          message: badgeMessage(name, b.badge_id, b.badges.name, b.badges.description, b.id),
          createdAt: b.earned_at,
        });
        usedUsers.add(b.user_id);
      }

      // Daily sprint completions (after 1v1 wins, before daily challenge completions)
      for (const c of (sprintCompletions || []) as {
        id: string;
        profile_id: string;
        combo_id: string;
        duration_ms: number;
        is_pr: boolean;
        is_crown: boolean;
        created_at: string;
      }[]) {
        if (usedUsers.has(c.profile_id)) continue;
        const profile = profileMap.get(c.profile_id);
        if (!profile) continue;
        const name = getDisplayName(profile);
        const seconds = (c.duration_ms / 1000).toFixed(2);
        const comboName = comboNameMap.get(c.combo_id) ?? 'today’s sprint';

        let message: string;
        if (c.is_crown) {
          message = pickForId([
            `${name} set today's pace at ${seconds}s!`,
            `${name} is setting the pace — ${seconds}s on ${comboName}`,
            `${name} is the one to beat today — ${seconds}s`,
          ], c.id);
        } else if (c.is_pr) {
          message = pickForId([
            `${name} hit a NEW PR of ${seconds}s!`,
            `${name} smashed their PR — ${seconds}s on ${comboName}`,
            `${name} just beat their best time — ${seconds}s`,
          ], c.id);
        } else {
          message = pickForId([
            `${name} logged today's sprint in ${seconds}s`,
            `${name} completed ${comboName} in ${seconds}s`,
            `${name} clocked ${seconds}s on today's sprint`,
          ], c.id);
        }

        items.push({
          id: `sprint-${c.id}`,
          userId: c.profile_id,
          name,
          avatarUrl: profile.avatar_url ?? null,
          message,
          createdAt: c.created_at,
        });
        usedUsers.add(c.profile_id);
      }

      // Daily challenge completions (after 1v1 wins, before training sessions)
      for (const c of (dailyChallengeCompletions || []) as any[]) {
        if (usedUsers.has(c.profile_id)) continue;
        const profile = profileMap.get(c.profile_id);
        if (!profile) continue;
        const name = getDisplayName(profile);
        const mins = Math.floor(c.time_seconds / 60);
        const secs = String(c.time_seconds % 60).padStart(2, '0');
        items.push({
          id: `daily-challenge-${c.id}`,
          userId: c.profile_id,
          name,
          avatarUrl: profile.avatar_url ?? null,
          message: pickForId([
            `${name} finished today's challenge in ${mins}:${secs}`,
            `${name} crushed the daily challenge — ${mins}:${secs}`,
            `${name} clocked ${mins}:${secs} on today's challenge`,
          ], c.id),
          createdAt: c.created_at,
        });
        usedUsers.add(c.profile_id);
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
          message: sessionMessage(name, stats.totalTouches, stats.sessionCount, stats.hasChallenge, `${userId}-${stats.latestAt}`),
          createdAt: stats.latestAt,
          isGameSpeed: stats.isGameSpeed,
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
          message: getStreetFeedMessage(completion.category, completion.challenge_name, name, completion.id),
          createdAt: completion.created_at,
        });
      }

      return items
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, limit);
    },
  });
}
