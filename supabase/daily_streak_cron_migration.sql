-- Runs daily-streak-check once a day. No per-user timezone is stored, so
-- this is a fixed UTC time (20:00 UTC ≈ early-to-mid afternoon US) rather
-- than per-user-local 3pm — a known simplification vs. the old client logic.
create extension if not exists pg_cron with schema extensions;

select cron.schedule(
  'daily-streak-check',
  '0 20 * * *',
  $$
  select net.http_post(
    url := 'https://zlfrydgrxtozidcbuevs.supabase.co/functions/v1/daily-streak-check',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);
