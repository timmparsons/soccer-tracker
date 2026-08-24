-- Adds duration_seconds to workouts so a row can double as an interval
-- "Circuit" (station time = duration_seconds / steps.length), and seeds the
-- 5-Min and 10-Min Circuit content used by the Train tab's Structured
-- Workout Engine. Applied live via mcp__supabase__apply_migration (see
-- migration "add_duration_seconds_to_workouts").

ALTER TABLE public.workouts ADD COLUMN duration_seconds INT;

INSERT INTO public.workouts (title, category, duration_seconds, steps) VALUES
(
  '5-Min Circuit',
  'Circuit',
  300,
  '[
    {"drill_id":"6af98047-8f82-4e26-9e71-647c3040cacc","reps":60},
    {"drill_id":"b4b5b83d-3070-4001-9fd3-258b0e588597","reps":60},
    {"drill_id":"277316f0-8d14-47af-9c89-d14dff70f27d","reps":50},
    {"drill_id":"839ca238-1fa9-4703-a1dd-f679d08ddbb8","reps":50},
    {"drill_id":"971fdee3-c501-4e2c-936b-042e22f0a2cf","reps":90}
  ]'::jsonb
),
(
  '10-Min Circuit',
  'Circuit',
  600,
  '[
    {"drill_id":"6af98047-8f82-4e26-9e71-647c3040cacc","reps":60},
    {"drill_id":"b4b5b83d-3070-4001-9fd3-258b0e588597","reps":60},
    {"drill_id":"bd921a99-b593-4fc6-92e5-44e6c9887564","reps":40},
    {"drill_id":"277316f0-8d14-47af-9c89-d14dff70f27d","reps":60},
    {"drill_id":"839ca238-1fa9-4703-a1dd-f679d08ddbb8","reps":60},
    {"drill_id":"d97b8dd2-12c4-41e9-ac44-6936470c304f","reps":60},
    {"drill_id":"971fdee3-c501-4e2c-936b-042e22f0a2cf","reps":60},
    {"drill_id":"394606b5-278f-4efb-bfb3-63d41be90317","reps":60},
    {"drill_id":"03e120d5-038c-4874-931d-4c7d74a19784","reps":60},
    {"drill_id":"4b667fcb-8e4b-467f-aef4-ca1af3a6eeab","reps":60}
  ]'::jsonb
);
