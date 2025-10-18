import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Connection, PublicKey, Transaction, SystemProgram } from '@solana/web3.js';
import { 
  getAssociatedTokenAddress, 
  createTransferInstruction,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from '@solana/spl-token';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { SOLANA_CONFIG } from '@/lib/wagmiConfig';

export function useSolanaPurchase(quantity: number, onSuccess: () => void) {
  const { publicKey, sendTransaction } = useWallet();
  const [isProcessing, setIsProcessing] = useState(false);

  const executePurchase = async () => {
    if (!publicKey) {
      toast.error('Please connect your Solana wallet');
      return;
    }

    setIsProcessing(true);
    try {
      const connection = new Connection('https://api.devnet.solana.com'); // Use mainnet in production
      const usdcMint = new PublicKey(SOLANA_CONFIG.usdcMint.devnet);
      const devWallet = new PublicKey(SOLANA_CONFIG.devWallet);

      // Get user's USDC token account
      const userUsdcAccount = await getAssociatedTokenAddress(
        usdcMint,
        publicKey,
        false,
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      );

      // Get dev's USDC token account
      const devUsdcAccount = await getAssociatedTokenAddress(
        usdcMint,
        devWallet,
        false,
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      );

      // Check user balance
      const userBalance = await connection.getTokenAccountBalance(userUsdcAccount);
      const usdcAmount = quantity * 1_000_000; // USDC has 6 decimals
      
      if (parseInt(userBalance.value.amount) < usdcAmount) {
        toast.error('Insufficient USDC balance');
        setIsProcessing(false);
        return;
      }

      toast.info('Creating transaction...');

      // Create transfer instruction
      const transaction = new Transaction().add(
        createTransferInstruction(
          userUsdcAccount,
          devUsdcAccount,
          publicKey,
          usdcAmount,
          [],
          TOKEN_PROGRAM_ID
        )
      );

      // Set recent blockhash
      const { blockhash } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = publicKey;

      toast.info('Please approve the transaction...');

      // Send transaction
      const signature = await sendTransaction(transaction, connection);
      
      toast.info('Confirming transaction...');
      
      // Wait for confirmation
      await connection.confirmTransaction(signature, 'confirmed');

      toast.info('Verifying on-chain transaction...');

      // Record in database
      await supabase.from('purchases').insert({
        wallet_address: publicKey.toBase58(),
        chain: 'solana',
        tx_hash: signature,
        quantity,
        amount: quantity * 1.0,
        status: 'pending',
        session_id: `SOLANA-${Date.now()}`,
      });

      // Verify via backend
      const { data, error } = await supabase.functions.invoke('verify-transaction', {
        body: {
          tx_hash: signature,
          chain: 'solana',
          wallet_address: publicKey.toBase58(),
          quantity,
        },
      });

      if (error || !data?.verified) {
        throw new Error(data?.error || 'Verification failed');
      }

      toast.success('✅ GOAT Credits Purchased On-Chain!');
      onSuccess();
    } catch (error: any) {
      console.error('Solana purchase error:', error);
      toast.error(error.message || 'Transaction failed');
    } finally {
      setIsProcessing(false);
    }
  };

  return {
    executePurchase,
    isProcessing,
  };
}
