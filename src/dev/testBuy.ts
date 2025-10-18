// Simple test helper to simulate a buy from the browser console
// Usage:
//   await window.testBuyCredits(3, '<your_wallet_address>', 'base')
// You should see the HUD update after the call.
import { supabase } from '@/integrations/supabase/client';

async function testBuyCredits(quantity: number, wallet: string, chain: 'base' | 'solana' = 'base') {
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 10) {
    console.error('Quantity must be an integer between 1 and 10');
    return;
  }
  if (!wallet) {
    console.error('Provide wallet address');
    return;
  }
  const { data, error } = await supabase.functions.invoke('buy-credits', {
    body: { wallet_address: wallet, chain, quantity },
  });
  if (error) {
    console.error('buy-credits error', error);
  } else {
    console.log('buy-credits success', data);
  }
}

// @ts-ignore
(window as any).testBuyCredits = testBuyCredits;
