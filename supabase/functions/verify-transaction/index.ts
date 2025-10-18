import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';
import { Connection, PublicKey } from 'https://esm.sh/@solana/web3.js@1.98.4';
import { ethers } from 'https://esm.sh/ethers@6.15.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const TREASURY_ADDRESSES = {
  solana: 'E1NDUr8TJ2R3hgupEMKLwARx1a2TJSaNkt5j881LWDVv',
  base: '0x146d92e9f13cbd4c1166a2e7094de36596d4a3ba',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { tx_hash, chain, wallet_address, quantity } = await req.json();
    
    console.log('Verifying transaction:', { tx_hash, chain, wallet_address, quantity });

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Check for duplicate transaction hash
    const { data: existingTx } = await supabase
      .from('purchases')
      .select('id')
      .eq('tx_hash', tx_hash)
      .eq('status', 'confirmed');

    if (existingTx && existingTx.length > 0) {
      console.error('Duplicate transaction hash detected');
      return new Response(
        JSON.stringify({ error: 'Transaction already used' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let verified = false;
    let blockNumber: number | null = null;

    if (chain === 'solana') {
      // Verify Solana transaction
      const connection = new Connection('https://api.devnet.solana.com');
      
      try {
        const tx = await connection.getTransaction(tx_hash, {
          maxSupportedTransactionVersion: 0
        });
        
        if (!tx || !tx.meta || tx.meta.err) {
          console.error('Solana transaction not found or failed');
          return new Response(
            JSON.stringify({ error: 'Transaction not found or failed' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Verify the recipient is the treasury
        const accountKeys = tx.transaction.message.getAccountKeys();
        const toAddress = accountKeys.get(1)?.toString(); // Usually index 1 is the recipient
        
        // Verify amount (1 SOL per credit)
        const expectedLamports = quantity * 1_000_000_000;
        const postBalance = tx.meta.postBalances[1];
        const preBalance = tx.meta.preBalances[1];
        const actualTransfer = postBalance - preBalance;

        if (toAddress !== TREASURY_ADDRESSES.solana) {
          console.error('Invalid recipient address');
          return new Response(
            JSON.stringify({ error: 'Invalid recipient address' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        if (Math.abs(actualTransfer - expectedLamports) > 1000) { // Allow small variance for fees
          console.error('Invalid transfer amount');
          return new Response(
            JSON.stringify({ error: 'Invalid transfer amount' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        verified = true;
        blockNumber = tx.slot;
      } catch (error) {
        console.error('Solana verification error:', error);
        return new Response(
          JSON.stringify({ error: 'Failed to verify Solana transaction' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } else {
      // Verify Base/EVM transaction
      const provider = new ethers.JsonRpcProvider('https://mainnet.base.org');
      
      try {
        const tx = await provider.getTransaction(tx_hash);
        
        if (!tx) {
          console.error('EVM transaction not found');
          return new Response(
            JSON.stringify({ error: 'Transaction not found' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Wait for confirmations
        const receipt = await tx.wait(3); // Wait for 3 confirmations
        
        if (!receipt || receipt.status !== 1) {
          console.error('EVM transaction failed');
          return new Response(
            JSON.stringify({ error: 'Transaction failed' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Verify recipient
        if (tx.to?.toLowerCase() !== TREASURY_ADDRESSES.base.toLowerCase()) {
          console.error('Invalid recipient address');
          return new Response(
            JSON.stringify({ error: 'Invalid recipient address' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Verify amount (0.001 ETH per credit)
        const expectedValue = ethers.parseEther((quantity * 0.001).toString());
        if (tx.value !== expectedValue) {
          console.error('Invalid transfer amount');
          return new Response(
            JSON.stringify({ error: 'Invalid transfer amount' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        verified = true;
        blockNumber = receipt.blockNumber;
      } catch (error) {
        console.error('EVM verification error:', error);
        return new Response(
          JSON.stringify({ error: 'Failed to verify EVM transaction' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    if (verified) {
      // Update purchase status
      const { error: updateError } = await supabase
        .from('purchases')
        .update({
          status: 'confirmed',
          verified_at: new Date().toISOString(),
          tokens_credited: quantity,
        })
        .eq('tx_hash', tx_hash);

      if (updateError) {
        console.error('Failed to update purchase:', updateError);
        return new Response(
          JSON.stringify({ error: 'Failed to update purchase' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Credit the user
      const { data: user } = await supabase
        .from('users')
        .select('credits')
        .eq('wallet_address', wallet_address)
        .single();

      if (user) {
        await supabase
          .from('users')
          .update({ credits: user.credits + quantity })
          .eq('wallet_address', wallet_address);
      }

      console.log('Transaction verified successfully');
      return new Response(
        JSON.stringify({ verified: true, blockNumber }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Verification failed' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in verify-transaction:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
