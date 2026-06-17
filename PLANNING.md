# Master Touch — Future Ideas & Planning Notes

## Invite Code → Auto-Premium

When a user signs up and enters an invite code provided by their coach, automatically set `is_premium = true` on their profile.

**How it could work:**
- Coach generates a unique invite code (stored in a `team_invite_codes` table, linked to `team_id`)
- During onboarding (e.g. after the persona step), player enters the code
- On submit: validate code → insert player into team, set `is_premium = true` on their profile
- Bonus: auto-sets `team_id` on the profile so they join the right squad

**Why:** Removes friction — players on a coach's paid plan shouldn't have to subscribe separately. Coach pays, players get access automatically.
