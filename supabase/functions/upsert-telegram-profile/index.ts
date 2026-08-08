import { createClient } from 'npm:@supabase/supabase-js@2';

// Full CORS headers — covers all headers sent by Supabase JS SDK and Telegram WebView
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const {
      telegram_id,
      first_name,
      last_name,
      username,
      photo_url,
    } = await req.json();

    if (!telegram_id) {
      return new Response(
        JSON.stringify({ error: 'telegram_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use service role to bypass RLS
    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const tidStr = String(telegram_id);
    const displayName = `${first_name}${last_name ? ' ' + last_name : ''}`;
    const formattedUsername = username ? `@${username}` : null;
    const telegramProfileUrl = username
      ? `https://t.me/${username}`
      : null;

    // Check if profile exists
    const { data: existing, error: selectErr } = await adminClient
      .from('profiles')
      .select('*')
      .eq('telegram_id', tidStr)
      .maybeSingle();

    if (selectErr) {
      console.error('Select error:', selectErr);
      throw selectErr;
    }

    let profile;

    if (existing) {
      // Update — never touch role or balance
      const { data: updated, error: updateErr } = await adminClient
        .from('profiles')
        .update({
          display_name: displayName,
          avatar_url: photo_url ?? null,
          username: formattedUsername,
          telegram_profile_url: telegramProfileUrl,
        })
        .eq('telegram_id', tidStr)
        .select()
        .single();

      if (updateErr) {
        console.error('Update error:', updateErr);
        throw updateErr;
      }
      profile = updated;
      console.log('Profile updated:', tidStr);
    } else {
      // Insert new user
      const referralCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      const isSuperAdmin = Number(telegram_id) === 169262990;

      const { data: inserted, error: insertErr } = await adminClient
        .from('profiles')
        .insert({
          uid: crypto.randomUUID(),
          telegram_id: tidStr,
          display_name: displayName,
          avatar_url: photo_url ?? null,
          username: formattedUsername,
          telegram_profile_url: telegramProfileUrl,
          role: isSuperAdmin ? 'superadmin' : 'player',
          balance: 100,
          level: 1,
          referral_code: referralCode,
          referral_count: 0,
          referral_earnings: 0,
          author_earnings: 0,
          author_status: 'none',
        })
        .select()
        .single();

      if (insertErr) {
        console.error('Insert error:', insertErr);
        throw insertErr;
      }
      profile = inserted;
      console.log('New profile created:', tidStr, 'role:', isSuperAdmin ? 'superadmin' : 'player');
    }

    return new Response(JSON.stringify({ profile }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('upsert-telegram-profile error:', err);
    return new Response(
      JSON.stringify({ error: err.message ?? 'Internal error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
