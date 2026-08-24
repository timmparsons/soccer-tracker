import { supabase } from '@/lib/supabase';
import { getLocalDate } from '@/utils/getLocalDate';

// STEP TYPES
export type DailyChallengeStep =
  | {
      type: 'single';
      reps: number;
      drillId: string;
      drillName: string;
      videoUrl?: string;
      note?: string;
    }
  | {
      type: 'combo';
      reps: number;
      comboName: string;
      drills: { drillId: string; drillName: string; videoUrl?: string }[];
    };

// RAW STEP FORMATS (as stored in Supabase JSONB)
type RawSingleStep = { drill_id: string; reps: number; note?: string };
type RawComboStep = { combo_name: string; drill_ids: string[]; reps: number };
export type RawStep = RawSingleStep | RawComboStep;

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

// Resolves raw JSONB steps (as stored in Supabase) into display-ready steps
// by looking up each drill's name/video from a drillId -> info map. Shared
// with hooks/useWorkouts.ts, which stores steps in the same raw shape.
export function resolveSteps(
  rawSteps: RawStep[],
  drillMap: Map<string, { name: string; videoUrl?: string }>,
): DailyChallengeStep[] {
  return rawSteps.map((step): DailyChallengeStep => {
    if ('drill_id' in step) {
      const drill = drillMap.get(step.drill_id);
      return {
        type: 'single',
        reps: step.reps,
        drillId: step.drill_id,
        drillName: drill?.name ?? 'Unknown',
        videoUrl: drill?.videoUrl,
        note: step.note,
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
}

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
