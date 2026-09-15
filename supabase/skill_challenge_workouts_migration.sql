-- Seeds single-skill "do it N times" challenges (e.g. "25 Sole Rolls") as
-- workouts rows with one step and no duration_seconds, so they can rotate
-- into Home's "Challenge of the Day" alongside the 5-Min Circuit and 4-Min
-- Burst. Run via mcp__supabase__apply_migration (see migration
-- "add_skill_challenge_workouts").

INSERT INTO public.workouts (title, category, duration_seconds, steps) VALUES
('Sole Roll Challenge', 'Skill Challenge', NULL, '[{"drill_id":"277316f0-8d14-47af-9c89-d14dff70f27d","reps":25}]'::jsonb),
('Bell Tap Challenge', 'Skill Challenge', NULL, '[{"drill_id":"b4b5b83d-3070-4001-9fd3-258b0e588597","reps":30}]'::jsonb),
('Toe Tap Challenge', 'Skill Challenge', NULL, '[{"drill_id":"6af98047-8f82-4e26-9e71-647c3040cacc","reps":40}]'::jsonb),
('V Pull Back Challenge', 'Skill Challenge', NULL, '[{"drill_id":"839ca238-1fa9-4703-a1dd-f679d08ddbb8","reps":20}]'::jsonb),
('Inside-Outside Challenge', 'Skill Challenge', NULL, '[{"drill_id":"971fdee3-c501-4e2c-936b-042e22f0a2cf","reps":20}]'::jsonb),
('Scissor Challenge', 'Skill Challenge', NULL, '[{"drill_id":"03e120d5-038c-4874-931d-4c7d74a19784","reps":15}]'::jsonb),
('L Pull Back Challenge', 'Skill Challenge', NULL, '[{"drill_id":"09159a88-da9c-4e09-a8a6-06da0f4a10cd","reps":12}]'::jsonb),
('Push & Pull Challenge', 'Skill Challenge', NULL, '[{"drill_id":"d97b8dd2-12c4-41e9-ac44-6936470c304f","reps":15}]'::jsonb),
('Foot Catch Challenge', 'Skill Challenge', NULL, '[{"drill_id":"4b667fcb-8e4b-467f-aef4-ca1af3a6eeab","reps":12}]'::jsonb),
('Juggling Challenge', 'Skill Challenge', NULL, '[{"drill_id":"bd921a99-b593-4fc6-92e5-44e6c9887564","reps":40}]'::jsonb);
