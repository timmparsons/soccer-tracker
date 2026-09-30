-- Expands Skill Challenge from 9 to 20 options so Home's "Challenge of the
-- Day" skill rotation (pickDailySkillChallenge in hooks/useWorkouts.ts) has
-- real variety instead of repeating the same handful. Bumps a few existing
-- rep counts that felt low, adds the 6 drills with no Skill Challenge entry
-- yet, and adds 4 "Pro" stretch variants on the flashiest moves. Run via
-- mcp__supabase__apply_migration (see migration "expand_skill_challenges").

-- Bump existing rep counts
UPDATE public.workouts SET steps = '[{"drill_id":"6af98047-8f82-4e26-9e71-647c3040cacc","reps":45}]'::jsonb WHERE title = 'Toe Tap Challenge' AND category = 'Skill Challenge';
UPDATE public.workouts SET steps = '[{"drill_id":"b4b5b83d-3070-4001-9fd3-258b0e588597","reps":40}]'::jsonb WHERE title = 'Bell Tap Challenge' AND category = 'Skill Challenge';
UPDATE public.workouts SET steps = '[{"drill_id":"bd921a99-b593-4fc6-92e5-44e6c9887564","reps":50}]'::jsonb WHERE title = 'Juggling Challenge' AND category = 'Skill Challenge';
UPDATE public.workouts SET steps = '[{"drill_id":"839ca238-1fa9-4703-a1dd-f679d08ddbb8","reps":35}]'::jsonb WHERE title = 'V Pull Back Challenge' AND category = 'Skill Challenge';
UPDATE public.workouts SET steps = '[{"drill_id":"d97b8dd2-12c4-41e9-ac44-6936470c304f","reps":20}]'::jsonb WHERE title = 'Push & Pull Challenge' AND category = 'Skill Challenge';
UPDATE public.workouts SET steps = '[{"drill_id":"03e120d5-038c-4874-931d-4c7d74a19784","reps":20}]'::jsonb WHERE title = 'Scissor Challenge' AND category = 'Skill Challenge';
UPDATE public.workouts SET steps = '[{"drill_id":"4b667fcb-8e4b-467f-aef4-ca1af3a6eeab","reps":20}]'::jsonb WHERE title = 'Foot Catch Challenge' AND category = 'Skill Challenge';
UPDATE public.workouts SET steps = '[{"drill_id":"09159a88-da9c-4e09-a8a6-06da0f4a10cd","reps":50}]'::jsonb WHERE title = 'L Pull Back Challenge' AND category = 'Skill Challenge';

-- New drills that had zero Skill Challenge entry
INSERT INTO public.workouts (title, category, duration_seconds, steps) VALUES
('Cruyff Turn Challenge', 'Skill Challenge', NULL, '[{"drill_id":"394606b5-278f-4efb-bfb3-63d41be90317","reps":30}]'::jsonb),
('Elastico Challenge', 'Skill Challenge', NULL, '[{"drill_id":"ace4d7b2-fecd-461a-a40d-cdee90515205","reps":20}]'::jsonb),
('Push-Scissor Challenge', 'Skill Challenge', NULL, '[{"drill_id":"408632da-eafc-4ee7-91ab-3d4285b56091","reps":15}]'::jsonb),
('Hocus Pocus Challenge', 'Skill Challenge', NULL, '[{"drill_id":"26875f5a-fa5b-427d-9a8d-3f72109ef228","reps":15}]'::jsonb),
('Maradona Spin Challenge', 'Skill Challenge', NULL, '[{"drill_id":"ffa79d48-51fc-437b-9460-50f32e981fee","reps":10}]'::jsonb),
('Figure-8 Challenge', 'Skill Challenge', NULL, '[{"drill_id":"48f71f6d-0048-4c4a-8e10-2b07536aced3","reps":8}]'::jsonb),

-- "Pro" stretch variants — same drill, bigger number
('V Pull Back Pro Challenge', 'Skill Challenge', NULL, '[{"drill_id":"839ca238-1fa9-4703-a1dd-f679d08ddbb8","reps":60}]'::jsonb),
('Cruyff Turn Pro Challenge', 'Skill Challenge', NULL, '[{"drill_id":"394606b5-278f-4efb-bfb3-63d41be90317","reps":75}]'::jsonb),
('Toe Tap Pro Challenge', 'Skill Challenge', NULL, '[{"drill_id":"6af98047-8f82-4e26-9e71-647c3040cacc","reps":100}]'::jsonb),
('Juggling Pro Challenge', 'Skill Challenge', NULL, '[{"drill_id":"bd921a99-b593-4fc6-92e5-44e6c9887564","reps":100}]'::jsonb);
