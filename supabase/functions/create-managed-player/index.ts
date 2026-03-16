import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

  // Verify caller JWT and fetch their profile
  const callerClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: { user: caller }, error: userError } = await callerClient.auth.getUser();
  if (userError || !caller) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  const { data: coachProfile, error: profileError } = await adminClient
    .from('profiles')
    .select('is_coach, team_id')
    .eq('id', caller.id)
    .single();

  if (profileError || !coachProfile?.is_coach) {
    return new Response(JSON.stringify({ error: 'forbidden' }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (!coachProfile.team_id) {
    return new Response(JSON.stringify({ error: 'no_team' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  let body: { name?: string; email?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'invalid_body' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const { name, email, password } = body;
  if (!name?.trim() || !email?.trim() || !password?.trim()) {
    return new Response(JSON.stringify({ error: 'missing_fields' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const firstName = name.trim().split(' ')[0];

  // Create auth user
  const { data: authData, error: createError } = await adminClient.auth.admin.createUser({
    email: email.trim(),
    password: password.trim(),
    email_confirm: true,
    user_metadata: { first_name: firstName },
  });

  if (createError) {
    if (createError.message.toLowerCase().includes('already registered') || createError.status === 422) {
      return new Response(JSON.stringify({ error: 'email_taken' }), {
        status: 409,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    return new Response(JSON.stringify({ error: createError.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const newUserId = authData.user.id;

  // Insert profile
  const { error: profileInsertError } = await adminClient.from('profiles').insert({
    id: newUserId,
    name: name.trim(),
    display_name: firstName,
    team_id: coachProfile.team_id,
    is_coach: false,
    onboarding_completed: true,
    managed_by: caller.id,
  });

  if (profileInsertError) {
    // Clean up orphaned auth user
    await adminClient.auth.admin.deleteUser(newUserId);
    return new Response(JSON.stringify({ error: profileInsertError.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Insert default target
  await adminClient.from('user_targets').insert({
    user_id: newUserId,
    daily_target_touches: 1000,
  });

  return new Response(JSON.stringify({ id: newUserId, name: name.trim(), email: email.trim() }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
