import { createClient } from 'npm:@supabase/supabase-js@2';

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
    // Accept either referrer_telegram_id (Telegram flow) or referrer_referral_code (web flow)
    const { user_uid, referrer_telegram_id, referrer_referral_code } = await req.json();

    if (!user_uid || (!referrer_telegram_id && !referrer_referral_code)) {
      return new Response(
        JSON.stringify({ error: 'user_uid and either referrer_telegram_id or referrer_referral_code are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // 1. Load current user profile
    const { data: currentUser, error: currentUserErr } = await adminClient
      .from('profiles')
      .select('uid, telegram_id, referred_by, referred_code, balance, referral_code')
      .eq('uid', user_uid)
      .maybeSingle();

    if (currentUserErr || !currentUser) {
      console.error('[handle-referral] Current user not found:', currentUserErr);
      return new Response(
        JSON.stringify({ error: 'Current user not found', skipped: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Check if already referred (either via Telegram or web)
    if (currentUser.referred_by || currentUser.referred_code) {
      console.log('[handle-referral] Already referred, skipping');
      return new Response(
        JSON.stringify({ skipped: true, reason: 'already_referred' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Find referrer — by telegram_id OR by referral_code
    let referrer: any = null;
    let referrerErr: any = null;
    let isWebReferral = false;

    if (referrer_telegram_id) {
      const referrerIdStr = String(referrer_telegram_id);

      // Prevent self-referral
      if (currentUser.telegram_id === referrerIdStr) {
        console.log('[handle-referral] Self-referral skipped');
        return new Response(
          JSON.stringify({ skipped: true, reason: 'self_referral' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data, error } = await adminClient
        .from('profiles')
        .select('uid, telegram_id, referral_code, balance, referral_count, referral_earnings')
        .eq('telegram_id', referrerIdStr)
        .maybeSingle();
      referrer = data;
      referrerErr = error;
    } else {
      // Web referral: find by referral_code
      isWebReferral = true;

      // Prevent self-referral
      if (currentUser.referral_code === referrer_referral_code) {
        console.log('[handle-referral] Self-referral by referral_code skipped');
        return new Response(
          JSON.stringify({ skipped: true, reason: 'self_referral' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data, error } = await adminClient
        .from('profiles')
        .select('uid, telegram_id, referral_code, balance, referral_count, referral_earnings')
        .eq('referral_code', referrer_referral_code)
        .maybeSingle();
      referrer = data;
      referrerErr = error;
    }

    if (referrerErr || !referrer) {
      console.log('[handle-referral] Referrer not found');
      return new Response(
        JSON.stringify({ skipped: true, reason: 'referrer_not_found' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const BONUS = 100;

    // 4. Update current user: set referred_by (Telegram) or referred_code (web) + add bonus
    const userUpdate: Record<string, any> = {
      balance: (currentUser.balance ?? 0) + BONUS,
    };

    if (isWebReferral) {
      userUpdate.referred_code = referrer_referral_code;
    } else {
      userUpdate.referred_by = String(referrer_telegram_id);
    }

    const { error: updateUserErr } = await adminClient
      .from('profiles')
      .update(userUpdate)
      .eq('uid', user_uid);

    if (updateUserErr) {
      console.error('[handle-referral] Error updating current user:', updateUserErr);
      throw updateUserErr;
    }

    // 5. Update referrer: add bonus + increment referral_count + referral_earnings
    const { error: updateReferrerErr } = await adminClient
      .from('profiles')
      .update({
        balance: (referrer.balance ?? 0) + BONUS,
        referral_count: (referrer.referral_count ?? 0) + 1,
        referral_earnings: (referrer.referral_earnings ?? 0) + BONUS,
      })
      .eq('uid', referrer.uid);

    if (updateReferrerErr) {
      console.error('[handle-referral] Error updating referrer:', updateReferrerErr);
      throw updateReferrerErr;
    }

    const flowType = isWebReferral ? `referral_code=${referrer_referral_code}` : `telegram_id=${referrer_telegram_id}`;
    console.log(`[handle-referral] Referral processed: user ${user_uid} referred via ${flowType}. Both got +${BONUS}₽`);

    return new Response(
      JSON.stringify({ success: true, bonus: BONUS, referrer_uid: referrer.uid, flow: isWebReferral ? 'web' : 'telegram' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error('[handle-referral] Error:', err);
    return new Response(
      JSON.stringify({ error: err.message ?? 'Internal error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
