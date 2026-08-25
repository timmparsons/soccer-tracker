-- Adds single-drill entries to sprint_combos so the Daily Sprint on the
-- Home tab rotates between multi-skill combos and standalone single-skill
-- drills, not just 3-move combos. No schema change needed — drill_ids was
-- always a uuid[], sprint_combos never enforced a minimum length, and
-- useDailySprint/DailySprintCard/SprintTimerModal already render comboSteps
-- generically regardless of length. crown_threshold_ms is scaled down from
-- the 3-drill combos' ~1000-1130ms-per-execution pace for 5 reps of one drill.

insert into sprint_combos (name, drill_ids, reps, crown_threshold_ms) values
  ('Toe Taps',
   array['6af98047-8f82-4e26-9e71-647c3040cacc']::uuid[],
   5, 4500),
  ('Bell Taps',
   array['b4b5b83d-3070-4001-9fd3-258b0e588597']::uuid[],
   5, 4500),
  ('One-Foot Inside-Outside',
   array['971fdee3-c501-4e2c-936b-042e22f0a2cf']::uuid[],
   5, 6000),
  ('Foot Catches',
   array['4b667fcb-8e4b-467f-aef4-ca1af3a6eeab']::uuid[],
   5, 6000);
