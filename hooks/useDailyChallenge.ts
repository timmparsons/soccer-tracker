import { useTodayDate } from '@/hooks/useTodayDate';
import { supabase } from '@/lib/supabase';
import { getLocalDate } from '@/utils/getLocalDate';
import { useQuery } from '@tanstack/react-query';

// STEP TYPES
export type DailyChallengeStep =
  | {
      type: 'single';
      reps: number;
      drillId: string;
      drillName: string;
      videoUrl?: string;
    }
  | {
      type: 'combo';
      reps: number;
      comboName: string;
      drills: { drillId: string; drillName: string; videoUrl?: string }[];
    };

export interface DailyChallenge {
  id: string;
  date: string;
  title: string;
}

export interface DailyChallengeCompletion {
  time_seconds: number;
  created_at: string;
}

interface DailyChallengeData {
  challenge: DailyChallenge | null;
  steps: DailyChallengeStep[];
  userCompletion: DailyChallengeCompletion | null;
}

// RAW STEP FORMATS (as stored in Supabase JSONB)
type RawSingleStep = { drill_id: string; reps: number };
type RawComboStep = { combo_name: string; drill_ids: string[]; reps: number };
type RawStep = RawSingleStep | RawComboStep;

// DRILL ID CONSTANTS
const D = {
  SOLE_ROLLS:         '277316f0-8d14-47af-9c89-d14dff70f27d',
  V_PULL_BACK:        '839ca238-1fa9-4703-a1dd-f679d08ddbb8',
  L_PULL_BACK:        '09159a88-da9c-4e09-a8a6-06da0f4a10cd',
  TOE_TAPS:           '6af98047-8f82-4e26-9e71-647c3040cacc',
  BELL_TAPS:          'b4b5b83d-3070-4001-9fd3-258b0e588597',
  PULL_PUSH:          'd97b8dd2-12c4-41e9-ac44-6936470c304f',
  INSIDE_OUTSIDE:     '971fdee3-c501-4e2c-936b-042e22f0a2cf',
  CRUYFF_TURN:        '394606b5-278f-4efb-bfb3-63d41be90317',
  SCISSOR:            '03e120d5-038c-4874-931d-4c7d74a19784',
  FOOT_CATCHES:       '4b667fcb-8e4b-467f-aef4-ca1af3a6eeab',
  JUGGLING:           'bd921a99-b593-4fc6-92e5-44e6c9887564',
  FIGURE_OF_8:        '48f71f6d-0048-4c4a-8e10-2b07536aced3',
  MARADONA_SPIN:      'ffa79d48-51fc-437b-9460-50f32e981fee',
  ELASTICO:           'ace4d7b2-fecd-461a-a40d-cdee90515205',
  HOCUS_POCUS:        '26875f5a-fa5b-427d-9a8d-3f72109ef228',
  PUSH_SCISSOR:       '408632da-eafc-4ee7-91ab-3d4285b56091',
};

// Exposed so other daily-challenge-adjacent features (e.g. the sprint timer)
// can reference the same real drill UUIDs instead of duplicating them.
export const DRILL_IDS = D;

// Touches credited per rep for each drill
export const TOUCHES_PER_REP: Record<string, number> = {
  [D.TOE_TAPS]:       1,
  [D.BELL_TAPS]:      1,
  [D.JUGGLING]:       1,
  [D.SOLE_ROLLS]:     2,
  [D.V_PULL_BACK]:    2,
  [D.PULL_PUSH]:      2,
  [D.INSIDE_OUTSIDE]: 2,
  [D.CRUYFF_TURN]:    2,
  [D.SCISSOR]:        2,
  [D.ELASTICO]:       2,
  [D.FOOT_CATCHES]:   2,
  [D.L_PULL_BACK]:    3,
  [D.PUSH_SCISSOR]:   3,
  [D.HOCUS_POCUS]:    3,
  [D.MARADONA_SPIN]:  4,
  [D.FIGURE_OF_8]:    6,
};

export function calculateChallengeTouches(steps: DailyChallengeStep[]): number {
  let total = 0;
  for (const step of steps) {
    if (step.type === 'single') {
      total += (TOUCHES_PER_REP[step.drillId] ?? 2) * step.reps;
    } else {
      const comboTouches = step.drills.reduce((sum, d) => sum + (TOUCHES_PER_REP[d.drillId] ?? 2), 0);
      total += comboTouches * step.reps;
    }
  }
  return total;
}

// 24-challenge rotating fallback pool (~3.5 week rotation)
const FALLBACK_CHALLENGES: { title: string; steps: RawStep[] }[] = [
  // ── SINGLE-DRILL CHALLENGES ──────────────────────────────────────────────
  {
    title: 'Footwork Foundations',
    steps: [
      { drill_id: D.SOLE_ROLLS, reps: 30 },
      { drill_id: D.V_PULL_BACK, reps: 25 },
      { drill_id: D.L_PULL_BACK, reps: 12 },
    ],
  },
  {
    title: 'Ball Mastery Blast',
    steps: [
      { drill_id: D.TOE_TAPS, reps: 40 },
      { drill_id: D.BELL_TAPS, reps: 30 },
      { drill_id: D.PULL_PUSH, reps: 20 },
    ],
  },
  {
    title: 'Quick Feet',
    steps: [
      { drill_id: D.INSIDE_OUTSIDE, reps: 50 },
      { drill_id: D.SOLE_ROLLS, reps: 25 },
      { drill_id: D.CRUYFF_TURN, reps: 15 },
    ],
  },
  {
    title: 'Touch and Control',
    steps: [
      { drill_id: D.FOOT_CATCHES, reps: 20 },
      { drill_id: D.TOE_TAPS, reps: 40 },
      { drill_id: D.BELL_TAPS, reps: 30 },
    ],
  },
  {
    title: "Juggler's Circuit",
    steps: [
      { drill_id: D.JUGGLING, reps: 30 },
      { drill_id: D.FOOT_CATCHES, reps: 15 },
      { drill_id: D.TOE_TAPS, reps: 40 },
    ],
  },
  {
    title: 'Flair Day',
    steps: [
      { drill_id: D.ELASTICO, reps: 15 },
      { drill_id: D.SCISSOR, reps: 20 },
      { drill_id: D.SOLE_ROLLS, reps: 30 },
    ],
  },
  {
    title: 'Pace and Power',
    steps: [
      { drill_id: D.TOE_TAPS, reps: 60 },
      { drill_id: D.BELL_TAPS, reps: 40 },
      { drill_id: D.PULL_PUSH, reps: 20 },
    ],
  },
  {
    title: "Defender's Nightmare",
    steps: [
      { drill_id: D.MARADONA_SPIN, reps: 15 },
      { drill_id: D.CRUYFF_TURN, reps: 20 },
      { drill_id: D.V_PULL_BACK, reps: 25 },
    ],
  },
  {
    title: 'Sole Control',
    steps: [
      { drill_id: D.SOLE_ROLLS, reps: 40 },
      { drill_id: D.PULL_PUSH, reps: 25 },
      { drill_id: D.V_PULL_BACK, reps: 20 },
    ],
  },
  {
    title: 'Inside Out',
    steps: [
      { drill_id: D.INSIDE_OUTSIDE, reps: 40 },
      { drill_id: D.L_PULL_BACK, reps: 20 },
      { drill_id: D.SOLE_ROLLS, reps: 25 },
    ],
  },
  {
    title: 'Tricks and Turns',
    steps: [
      { drill_id: D.HOCUS_POCUS, reps: 10 },
      { drill_id: D.SCISSOR, reps: 20 },
      { drill_id: D.CRUYFF_TURN, reps: 15 },
      { drill_id: D.SOLE_ROLLS, reps: 20 },
    ],
  },
  {
    title: 'Full Circuit',
    steps: [
      { drill_id: D.BELL_TAPS, reps: 40 },
      { drill_id: D.V_PULL_BACK, reps: 25 },
      { drill_id: D.SCISSOR, reps: 15 },
      { drill_id: D.L_PULL_BACK, reps: 12 },
    ],
  },
  // ── COMBO CHALLENGES ────────────────────────────────────────────────────
  {
    title: 'V-Scissor-L',
    steps: [
      { combo_name: 'V → Scissor → L pull back', drill_ids: [D.V_PULL_BACK, D.SCISSOR, D.L_PULL_BACK], reps: 20 },
    ],
  },
  {
    title: 'The Cruyff Combo',
    steps: [
      { combo_name: 'V pull back → Cruyff Turn → L pull back', drill_ids: [D.V_PULL_BACK, D.CRUYFF_TURN, D.L_PULL_BACK], reps: 20 },
    ],
  },
  {
    title: 'Maradona Special',
    steps: [
      { combo_name: 'Maradona Spin → V pull back → L pull back', drill_ids: [D.MARADONA_SPIN, D.V_PULL_BACK, D.L_PULL_BACK], reps: 15 },
    ],
  },
  {
    title: 'Pull and Turn',
    steps: [
      { combo_name: 'Pull-Push → Cruyff Turn → V pull back', drill_ids: [D.PULL_PUSH, D.CRUYFF_TURN, D.V_PULL_BACK], reps: 18 },
    ],
  },
  {
    title: 'Combo King',
    steps: [
      { combo_name: 'V pull back → L pull back', drill_ids: [D.V_PULL_BACK, D.L_PULL_BACK], reps: 20 },
      { combo_name: 'V → Scissor → L pull back', drill_ids: [D.V_PULL_BACK, D.SCISSOR, D.L_PULL_BACK], reps: 15 },
    ],
  },
  {
    title: 'Elastico Circuit',
    steps: [
      { combo_name: 'Sole Rolls → Scissor → Elastico', drill_ids: [D.SOLE_ROLLS, D.SCISSOR, D.ELASTICO], reps: 10 },
    ],
  },
  {
    title: 'Triple Touch',
    steps: [
      { combo_name: 'Sole Rolls → V pull back → L pull back', drill_ids: [D.SOLE_ROLLS, D.V_PULL_BACK, D.L_PULL_BACK], reps: 18 },
    ],
  },
  {
    title: 'The Spin Combo',
    steps: [
      { combo_name: 'Maradona Spin → Cruyff Turn → V pull back', drill_ids: [D.MARADONA_SPIN, D.CRUYFF_TURN, D.V_PULL_BACK], reps: 14 },
    ],
  },
  {
    title: 'L-V Finisher',
    steps: [
      { combo_name: 'L pull back → V pull back → Cruyff Turn', drill_ids: [D.L_PULL_BACK, D.V_PULL_BACK, D.CRUYFF_TURN], reps: 20 },
    ],
  },
  {
    title: 'Push and Scissors',
    steps: [
      { combo_name: 'Pull-Push → Scissor → V pull back', drill_ids: [D.PULL_PUSH, D.SCISSOR, D.V_PULL_BACK], reps: 18 },
    ],
  },
  {
    title: 'Elite Drill',
    steps: [
      { combo_name: 'Cruyff Turn → L pull back → V pull back', drill_ids: [D.CRUYFF_TURN, D.L_PULL_BACK, D.V_PULL_BACK], reps: 15 },
    ],
  },
  {
    title: 'The Complete Player',
    steps: [
      { combo_name: 'V → Scissor → L pull back', drill_ids: [D.V_PULL_BACK, D.SCISSOR, D.L_PULL_BACK], reps: 15 },
      { combo_name: 'Maradona Spin → Cruyff Turn', drill_ids: [D.MARADONA_SPIN, D.CRUYFF_TURN], reps: 12 },
    ],
  },
];

function getFallbackForDate(dateStr: string) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const seed = y * 10000 + m * 100 + d;
  return FALLBACK_CHALLENGES[seed % FALLBACK_CHALLENGES.length];
}

export async function logChallengeSession(
  userId: string,
  touches: number,
  timeSeconds: number,
): Promise<void> {
  const { error } = await supabase.from('daily_sessions').insert({
    user_id: userId,
    touches_logged: touches,
    duration_minutes: Math.max(1, Math.round(timeSeconds / 60)),
    date: getLocalDate(),
  });
  if (error) throw error;
}

export async function saveDailyChallengeCompletion(
  challengeId: string,
  profileId: string,
  timeSeconds: number,
): Promise<void> {
  const { error } = await (supabase as any)
    .from('daily_challenge_completions')
    .insert({ challenge_id: challengeId, profile_id: profileId, time_seconds: timeSeconds });
  if (error) throw error;
}

export function useDailyChallenge(userId: string | undefined) {
  const today = useTodayDate();
  const { data, isLoading } = useQuery({
    queryKey: ['daily-challenge', userId, today],
    queryFn: async (): Promise<DailyChallengeData> => {
      if (!userId) throw new Error('No user ID');

      let { data: challengeRow } = await (supabase as any)
        .from('daily_challenges')
        .select('id, date, title, steps')
        .eq('date', today)
        .maybeSingle();

      // No entry for today — auto-insert from the fallback pool
      if (!challengeRow) {
        const fallback = getFallbackForDate(today);
        await (supabase as any)
          .from('daily_challenges')
          .upsert(
            { date: today, title: fallback.title, steps: fallback.steps },
            { onConflict: 'date', ignoreDuplicates: true },
          );

        const { data: inserted } = await (supabase as any)
          .from('daily_challenges')
          .select('id, date, title, steps')
          .eq('date', today)
          .maybeSingle();

        challengeRow = inserted;
      }

      if (!challengeRow) return { challenge: null, steps: [], userCompletion: null };

      // Collect all drill IDs (single + combo)
      const rawSteps = (challengeRow.steps as RawStep[]) || [];
      const allDrillIds = new Set<string>();
      for (const step of rawSteps) {
        if ('drill_id' in step) allDrillIds.add(step.drill_id);
        else step.drill_ids.forEach((id) => allDrillIds.add(id));
      }

      const { data: drills } = await supabase
        .from('drills')
        .select('id, name, video_url')
        .in('id', [...allDrillIds]);

      const drillMap = new Map(
        (drills || []).map((d: { id: string; name: string; video_url: string | null }) => [
          d.id,
          { name: d.name, videoUrl: d.video_url ?? undefined },
        ]),
      );

      const steps: DailyChallengeStep[] = rawSteps.map((step): DailyChallengeStep => {
        if ('drill_id' in step) {
          const drill = drillMap.get(step.drill_id);
          return {
            type: 'single',
            reps: step.reps,
            drillId: step.drill_id,
            drillName: drill?.name ?? 'Unknown',
            videoUrl: drill?.videoUrl,
          };
        } else {
          return {
            type: 'combo',
            reps: step.reps,
            comboName: step.combo_name,
            drills: step.drill_ids.map((id) => {
              const drill = drillMap.get(id);
              return { drillId: id, drillName: drill?.name ?? 'Unknown', videoUrl: drill?.videoUrl };
            }),
          };
        }
      });

      const { data: completion } = await (supabase as any)
        .from('daily_challenge_completions')
        .select('time_seconds, created_at')
        .eq('profile_id', userId)
        .eq('challenge_id', challengeRow.id)
        .maybeSingle();

      return {
        challenge: { id: challengeRow.id, date: challengeRow.date, title: challengeRow.title },
        steps,
        userCompletion: completion ?? null,
      };
    },
    enabled: !!userId,
  });

  return {
    challenge: data?.challenge ?? null,
    steps: data?.steps ?? [],
    userCompletion: data?.userCompletion ?? null,
    isLoading,
  };
}
