import { createClient } from 'jsr:@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

const PREMIUM_EVENT_TYPES = new Set([
  'INITIAL_PURCHASE',
  'RENEWAL',
  'PRODUCT_CHANGE',
  'UNCANCELLATION',
]);

const REVOKE_EVENT_TYPES = new Set([
  'EXPIRATION',
  'CANCELLATION',
  'BILLING_ISSUE',
  'SUBSCRIBER_ALIAS',
]);

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  let payload: Record<string, any>;
  try {
    payload = await req.json();
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }

  const event = payload.event;
  const appUserId: string | undefined = event?.app_user_id;
  const eventType: string | undefined = event?.type;
  const productId: string | undefined = event?.product_id;

  if (!appUserId || !eventType) {
    return new Response('Missing app_user_id or type', { status: 400 });
  }

  // Determine whether this is a coach or pro subscription
  const isCoachProduct = productId?.includes('coach') ?? false;
  const isPremiumEvent = PREMIUM_EVENT_TYPES.has(eventType);
  const isRevokeEvent = REVOKE_EVENT_TYPES.has(eventType);

  if (isPremiumEvent) {
    const update = isCoachProduct
      ? { is_premium: true, is_coach: true }
      : { is_premium: true };

    const { error } = await supabase
      .from('profiles')
      .update(update)
      .eq('id', appUserId);

    if (error) {
      console.error('Supabase update error:', error);
      return new Response('DB error', { status: 500 });
    }
  } else if (isRevokeEvent && !isCoachProduct) {
    // Only revoke pro — don't touch coach status on pro expiry
    const { error } = await supabase
      .from('profiles')
      .update({ is_premium: false })
      .eq('id', appUserId);

    if (error) {
      console.error('Supabase update error:', error);
      return new Response('DB error', { status: 500 });
    }
  }

  return new Response('ok', { status: 200 });
});
