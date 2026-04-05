-- Challenge streak + tier unlock badges
INSERT INTO badges (id, category, name, description, icon, color, sort_order) VALUES
  ('challenge_streak_3',    'challenge', '3-Day Challenge Streak',  'Attempted the daily challenge 3 days in a row',   'flame',      '#F59E0B', 220),
  ('challenge_streak_7',    'challenge', 'Challenge Week',          'Attempted the daily challenge 7 days in a row',   'flame',      '#EF4444', 230),
  ('challenge_streak_30',   'challenge', 'Challenge Month',         'Attempted the daily challenge 30 days in a row',  'flame',      '#8B5CF6', 240),
  ('challenge_intermediate','challenge', 'Intermediate Unlocked',   'Reached 10,000 lifetime touches',                 'trending-up','#1f89ee', 250),
  ('challenge_advanced',    'challenge', 'Advanced Unlocked',       'Reached 50,000 lifetime touches',                 'rocket',     '#ffb724', 260);
