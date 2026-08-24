-- Single-drill sprint combos (see single_skill_sprint_migration.sql) raced
-- 5 reps against a ~4.5-6s crown threshold, which is over in about a second
-- for something like Toe Taps. Single-drill combos now run as a fixed-duration
-- challenge instead (same duration pool as the Daily Challenge circuit): do
-- the drill for the whole window, then log how many reps you got. PR is
-- "most reps in the window" — there's no crown/threshold concept for these,
-- so is_crown is just left false on duration-mode attempts.

alter table sprint_attempts add column reps_completed integer;
