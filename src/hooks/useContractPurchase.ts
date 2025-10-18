import { useState } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi';
import { parseUnits } from 'viem';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { CONTRACTS } from '@/lib/wagmiConfig';
import GOATCreditsABI from '@/contracts/GOATCreditsABI.json';
import USDCABI from '@/contracts/USDCABI.json';

export function useContractPurchase(quantity: number, onSuccess: () => void) {
  const { address, chainId } = useAccount();
  const [step, setStep] = useState<'idle' | 'approving' | 'buying' | 'verifying'>('idle');
  
  const contractAddresses = chainId ? CONTRACTS[chainId as keyof typeof CONTRACTS] : null;
  
  // USDC approval
  const { writeContract: approveUSDC, data: approveTxHash } = useWriteContract();
  const { isLoading: isApproving } = useWaitForTransactionReceipt({
    hash: approveTxHash,
  });

  // Buy credits
  const { writeContract: buyCredits, data: buyTxHash } = useWriteContract();
  const { isLoading: isBuying } = useWaitForTransactionReceipt({
    hash: buyTxHash,
  });

  // Check USDC balance
  const { data: usdcBalance } = useReadContract({
    address: contractAddresses?.usdc,
    abi: USDCABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
  });

  // Check USDC allowance
  const { data: usdcAllowance } = useReadContract({
    address: contractAddresses?.usdc,
    abi: USDCABI,
    functionName: 'allowance',
    args: address && contractAddresses ? [address, contractAddresses.goatCredits] : undefined,
  });

  const executePurchase = async () => {
    if (!address || !contractAddresses || !chainId) {
      toast.error('Please connect your wallet');
      return;
    }

    try {
      const usdcAmount = parseUnits(quantity.toString(), 6); // USDC has 6 decimals

      // Check balance
      if (usdcBalance && BigInt(usdcBalance as string) < usdcAmount) {
        toast.error('Insufficient USDC balance');
        return;
      }

      // Check if approval is needed
      const needsApproval = !usdcAllowance || BigInt(usdcAllowance as string) < usdcAmount;

      if (needsApproval) {
        setStep('approving');
        toast.info('Approve USDC spending...');
        
        approveUSDC({
          address: contractAddresses.usdc,
          abi: USDCABI,
          functionName: 'approve',
          args: [contractAddresses.goatCredits, usdcAmount],
          account: address,
          chain: { id: chainId },
        } as any);

        // Wait for approval to complete before buying
        await new Promise(resolve => setTimeout(resolve, 3000));
      }

      // Buy credits
      setStep('buying');
      toast.info('Purchasing GOAT Credits...');
      
      buyCredits({
        address: contractAddresses.goatCredits,
        abi: GOATCreditsABI,
        functionName: 'buyCredits',
        args: [usdcAmount],
        account: address,
        chain: { id: chainId },
      } as any);

    } catch (error: any) {
      console.error('Purchase error:', error);
      toast.error(error.message || 'Transaction failed');
      setStep('idle');
    }
  };

  // Watch for successful purchase
  const verifyAndCredit = async (txHash: string) => {
    if (!address) return;

    try {
      setStep('verifying');
      toast.info('Verifying on-chain transaction...');

      // Record purchase in DB
      await supabase.from('purchases').insert({
        wallet_address: address,
        chain: 'base',
        tx_hash: txHash,
        quantity,
        amount: quantity * 1.0,
        status: 'pending',
        session_id: `CONTRACT-${Date.now()}`,
      });

      // Verify via backend
      const { data, error } = await supabase.functions.invoke('verify-transaction', {
        body: {
          tx_hash: txHash,
          chain: 'base',
          wallet_address: address,
          quantity,
        },
      });

      if (error || !data?.verified) {
        throw new Error(data?.error || 'Verification failed');
      }

      toast.success('✅ GOAT Credits Minted On-Chain!');
      onSuccess();
      setStep('idle');
    } catch (error: any) {
      console.error('Verification error:', error);
      toast.error('Failed to verify transaction');
      setStep('idle');
    }
  };

  return {
    executePurchase,
    verifyAndCredit,
    isProcessing: step !== 'idle',
    step,
    isApproving,
    isBuying,
    buyTxHash,
  };
}
