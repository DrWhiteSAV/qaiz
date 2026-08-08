import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

/**
 * Merges two profiles into one, keeping the "primary" (Telegram-priority) and
 * transferring/summing data from the "secondary". Deletes the secondary profile.
 *
 * Two modes:
 * 1. google_linking_in_tma: Called from GoogleCallback when link_uid is present.
 *    - primary_uid = Telegram profile (link_uid)
 *    - google_uid   = newly created Google auth user profile (to be absorbed & deleted)
 *    Merges Google email/avatar into Telegram profile. Deletes google_uid profile.
 *
 * 2. telegram_linking_in_browser: Called from useTelegramAuth when start_param=link_{uid}.
 *    - primary_uid  = Google browser profile (link_uid passed in URL)
 *    - telegram_uid = existing standalone Telegram profile (to be absorbed & deleted)
 *    Merges Telegram name/avatar/telegram_id into Google profile. Sums balances. Deletes telegram_uid profile.
 */
Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const body = await req.json();
    const { mode, primary_uid, secondary_uid } = body;

    if (!mode || !primary_uid || !secondary_uid) {
      return new Response(JSON.stringify({ error: 'mode, primary_uid and secondary_uid are required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Load both profiles
    const [{ data: primary }, { data: secondary }] = await Promise.all([
      admin.from('profiles').select('*').eq('uid', primary_uid).maybeSingle(),
      admin.from('profiles').select('*').eq('uid', secondary_uid).maybeSingle(),
    ]);

    if (!primary) {
      return new Response(JSON.stringify({ error: 'primary profile not found', primary_uid }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // secondary may be null (Google trigger created a profile or not)
    // Build merged update for primary — Telegram data wins, empty fields filled from secondary
    let update: Record<string, any> = {};

    // Role priority helper: superadmin > author > player
    const rolePriority = (role: string | null) => {
      if (role === 'superadmin') return 3;
      if (role === 'admin') return 2;
      if (role === 'author') return 1;
      return 0; // player or null
    };

    // Merge role — keep highest priority
    const pRole = primary.role || 'player';
    const sRole = secondary?.role || 'player';
    if (rolePriority(sRole) > rolePriority(pRole)) {
      update.role = sRole;
    }

    if (mode === 'google_linking_in_tma') {
      // primary = Telegram profile, secondary = Google-created profile
      if (!primary.email && secondary?.email) update.email = secondary.email;
      if (!primary.avatar_url && secondary?.avatar_url) update.avatar_url = secondary.avatar_url;
      if (secondary?.balance && secondary.balance > 0) {
        update.balance = (primary.balance || 0) + secondary.balance;
      }
    } else if (mode === 'telegram_linking_in_browser') {
      // primary = Google browser profile, secondary = standalone Telegram profile
      if (secondary?.telegram_id) update.telegram_id = secondary.telegram_id;
      if (secondary?.username) update.username = secondary.username;
      if (secondary?.telegram_profile_url) update.telegram_profile_url = secondary.telegram_profile_url;
      if (secondary?.display_name && secondary.display_name !== 'Игрок') {
        update.display_name = secondary.display_name;
      }
      if (secondary?.avatar_url && !primary.avatar_url) update.avatar_url = secondary.avatar_url;
      if (secondary?.balance && secondary.balance > 0) {
        update.balance = (primary.balance || 0) + secondary.balance;
      }
      if (secondary?.referral_count && secondary.referral_count > 0) {
        update.referral_count = (primary.referral_count || 0) + secondary.referral_count;
      }
      if (secondary?.referral_earnings && secondary.referral_earnings > 0) {
        update.referral_earnings = (primary.referral_earnings || 0) + secondary.referral_earnings;
      }
      if (!primary.referred_by && secondary?.referred_by) update.referred_by = secondary.referred_by;
      if (!primary.referred_code && secondary?.referred_code) update.referred_code = secondary.referred_code;
      if (!primary.referral_code && secondary?.referral_code) update.referral_code = secondary.referral_code;
    }

    // Apply update to primary
    if (Object.keys(update).length > 0) {
      const { error: updateErr } = await admin
        .from('profiles')
        .update(update)
        .eq('uid', primary_uid);
      if (updateErr) throw updateErr;
    }

    // Delete secondary profile (if it exists)
    if (secondary) {
      const { error: delErr } = await admin
        .from('profiles')
        .delete()
        .eq('uid', secondary_uid);
      if (delErr) {
        console.warn('[merge-accounts] Could not delete secondary profile:', delErr.message);
        // Not fatal — just log it
      }
    }

    // Return merged profile
    const { data: merged } = await admin
      .from('profiles')
      .select('*')
      .eq('uid', primary_uid)
      .maybeSingle();

    console.log(`[merge-accounts] mode=${mode} primary=${primary_uid} secondary=${secondary_uid} update_keys=${Object.keys(update).join(',')}`);

    return new Response(JSON.stringify({ success: true, profile: merged }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (err: any) {
    console.error('[merge-accounts] error:', err);
    return new Response(JSON.stringify({ error: err.message ?? 'Internal error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
