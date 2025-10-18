// Public edge function to simulate credit purchases for dev/testing
// Increments a user's credits instantly with validation and returns the new total
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
};

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: corsHeaders,
    });
  }

  try {
    const { wallet_address, chain, quantity } = await req.json().catch(() => ({}));

    // Input validation
    if (typeof wallet_address !== 'string' || !wallet_address.trim()) {
      return new Response(JSON.stringify({ error: 'wallet_address is required' }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    if (chain !== 'solana' && chain !== 'base') {
      return new Response(JSON.stringify({ error: 'chain must be "solana" or "base"' }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 10) {
      return new Response(JSON.stringify({ error: 'quantity must be an integer between 1 and 10' }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Ensure the RLS session is linked to this wallet for any security-definer functions
    try {
      await supabase.rpc('set_wallet_session', { wallet_addr: wallet_address });
    } catch (_) {
      // no-op
    }

    // Fetch or create user
    let currentCredits = 0;
    const fetchRes = await supabase
      .from('users')
      .select('credits')
      .eq('wallet_address', wallet_address)
      .limit(1)
      .single();

    let existing: any = null;
    if (fetchRes.data) existing = fetchRes.data;
    if (fetchRes.error && fetchRes.error.code !== 'PGRST116') {
      console.error('Fetch user error:', fetchRes.error);
      return new Response(JSON.stringify({ error: 'Failed to fetch user' }), {
        status: 500,
        headers: corsHeaders,
      });
    }

    if (!existing) {
      const { error: insertErr } = await supabase
        .from('users')
        .insert({ wallet_address, chain, credits: 0 });
      if (insertErr) {
        console.error('Insert user error:', insertErr);
        return new Response(JSON.stringify({ error: 'Failed to create user' }), {
          status: 500,
          headers: corsHeaders,
        });
      }
      currentCredits = 0;
    } else {
      currentCredits = Number(existing.credits ?? 0);
    }

    const newTotal = currentCredits + quantity;

    const { data: updated, error: updateErr } = await supabase
      .from('users')
      .update({ credits: newTotal, updated_at: new Date().toISOString() })
      .eq('wallet_address', wallet_address)
      .select('credits')
      .single();

    if (updateErr) {
      console.error('Update credits error:', updateErr);
      return new Response(JSON.stringify({ error: 'Failed to update credits' }), {
        status: 500,
        headers: corsHeaders,
      });
    }

    return new Response(
      JSON.stringify({ success: true, newCredits: Number(updated.credits) }),
      { headers: corsHeaders }
    );
  } catch (e) {
    console.error('Unhandled error in buy-credits:', e);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});