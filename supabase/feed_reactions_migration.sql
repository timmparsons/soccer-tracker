-- Extend feed_cheers beyond a single 👏 reaction to a small set of reaction
-- types (cheer, fire, fireworks, strong). The existing unique constraint on
-- (feed_item_key, cheered_by_profile_id) is kept as-is: a user still gets
-- exactly one reaction per feed item, so switching reactions updates the
-- row in place instead of stacking multiple reactions.

alter table feed_cheers
  add column reaction_type text not null default 'cheer';

alter table feed_cheers
  add constraint feed_cheers_reaction_type_check
  check (reaction_type in ('cheer', 'fire', 'fireworks', 'strong'));
