import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useWallet } from '@/contexts/WalletContext';
import { DollarSign, Loader2, CheckCircle, AlertCircle, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { TEST_MODE, simulateTransactionDelay, generateMockTxHash } from '@/lib/contractConfig';

export function SimulatedCreditPurchase() {
  const { walletAddress, chain, isConnected, refreshBalance, updateCredits } = useWallet();
  const [isOpen, setIsOpen] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [step, setStep] = useState<'idle' | 'approving' | 'buying' | 'verifying' | 'success'>('idle');
  const [progress, setProgress] = useState(0);

  const handleOpen = () => {
    if (!isConnected) {
      toast.error('Please connect your wallet first');
      return;
    }
    setIsOpen(true);
    setStep('idle');
    setProgress(0);
  };

  const handlePurchase = async () => {
    if (quantity < 1 || quantity > 10) {
      toast.error('Quantity must be between 1-10');
      return;
    }

    if (!walletAddress) return;

    setIsProcessing(true);
    const totalCost = quantity * 1.0;

    try {
      // Step 1: Approve USDC (Base only)
      if (chain === 'base') {
        setStep('approving');
        setProgress(10);
        toast.info('🔄 Approving USDC spending...');
        await simulateTransactionDelay(1500, 2500);
        setProgress(25);
      }

      // Step 2: Execute Purchase Transaction
      setStep('buying');
      setProgress(30);
      toast.info(`🚀 Purchasing ${quantity} GOAT Credit${quantity > 1 ? 's' : ''}...`);
      await simulateTransactionDelay(2000, 4000);
      setProgress(60);

      // Generate mock transaction hash
      const txHash = generateMockTxHash(chain === 'solana' ? 'solana' : 'base');
      
      // Step 3: Blockchain Confirmation
      toast.info('⛓️ Confirming on blockchain...');
      await simulateTransactionDelay(1500, 2500);
      setProgress(75);

      // Step 4: Record in Database
      setStep('verifying');
      toast.info('✅ Crediting your account...');

      // Simulation-only: call public edge function to increment credits instantly
      const { data: buyData, error: buyError } = await supabase.functions.invoke('buy-credits', {
        body: {
          wallet_address: walletAddress,
          chain: (chain || 'base'),
          quantity,
        },
      });

      if (buyError || !buyData?.success) {
        console.error('Simulation function error:', buyError || buyData);
        throw new Error(buyData?.error || 'Failed to credit account');
      }

      const newTotal = Number(buyData.newCredits ?? 0);
      // Optimistically update HUD immediately
      updateCredits(newTotal);

      setProgress(100);
      setStep('success');

      await simulateTransactionDelay(800, 1200);

      toast.success(`GOAT Credits Simulated: +${quantity} | Total: ${newTotal}`, {
        duration: 4000,
      });

      await refreshBalance();
      
      setTimeout(() => {
        setIsOpen(false);
        setQuantity(1);
        setStep('idle');
        setProgress(0);
      }, 1500);

    } catch (error: any) {
      console.error('Simulated purchase error:', error);
      toast.error('Transaction failed. Please try again.');
      setStep('idle');
      setProgress(0);
    } finally {
      setIsProcessing(false);
    }
  };

  const totalCost = quantity * 1.0;

  const getStepMessage = () => {
    switch (step) {
      case 'approving': return 'Approving USDC...';
      case 'buying': return 'Purchasing credits...';
      case 'verifying': return 'Verifying transaction...';
      case 'success': return 'Credits added!';
      default: return 'Ready to purchase';
    }
  };

  return (
    <>
      <Button 
        onClick={handleOpen} 
        className="bg-gradient-primary text-black font-bold neon-glow relative overflow-hidden group"
      >
        {TEST_MODE && (
          <span className="absolute top-0 right-0 bg-yellow-500 text-black text-[8px] px-1 py-0.5 rounded-bl font-bold">
            TEST
          </span>
        )}
        <DollarSign className="mr-2 h-5 w-5" />
        Buy GOAT Credits {TEST_MODE && '(Test Mode)'}
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="bg-gradient-card border-primary max-w-md">
          <DialogHeader>
            <DialogTitle className="neon-text text-2xl flex items-center gap-2">
              Buy GOAT Credits
              {TEST_MODE ? (
                <Badge variant="outline" className="text-xs bg-yellow-500/20 border-yellow-500">
                  <Zap className="w-3 h-3 mr-1" />
                  Test Mode
                </Badge>
              ) : (
                <Badge variant="outline" className="text-xs">
                  {chain === 'solana' ? 'Solana SPL' : 'Base ERC20'}
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Test Mode Notice */}
            {TEST_MODE && (
              <div className="p-3 bg-yellow-500/10 border border-yellow-500/50 rounded-lg">
                <div className="flex items-start gap-2">
                  <Zap className="h-5 w-5 text-yellow-500 mt-0.5" />
                  <div className="text-xs">
                    <div className="font-bold text-yellow-500 mb-1">Simulation Mode Active</div>
                    <div className="text-muted-foreground">
                      No real blockchain transactions. Perfect for testing the UX!
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Purchase Info */}
            <div className="text-center p-4 bg-primary/10 rounded-lg border-2 border-primary">
              <div className="text-4xl font-bold neon-text mb-2">${totalCost.toFixed(2)} USDC</div>
              <div className="text-sm text-muted-foreground">
                {quantity} Credit{quantity !== 1 ? 's' : ''} × $1.00 each
              </div>
            </div>

            {/* Quantity Input */}
            <div className="space-y-2">
              <Label className="text-foreground">Quantity (1-10 credits)</Label>
              <Input 
                type="number"
                min="1"
                max="10"
                value={quantity}
                onChange={(e) => setQuantity(Math.min(10, Math.max(1, parseInt(e.target.value) || 1)))}
                className="bg-input text-lg text-center font-bold"
                disabled={isProcessing}
              />
            </div>

            {/* Progress Bar */}
            {isProcessing && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{getStepMessage()}</span>
                  <span className="text-primary font-bold">{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>
            )}

            {/* Status Messages */}
            {isProcessing && (
              <div className="p-3 bg-accent/10 rounded-lg border border-accent">
                <div className="flex items-center gap-2 text-sm">
                  {step === 'success' ? (
                    <>
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span className="text-green-500 font-semibold">Transaction successful!</span>
                    </>
                  ) : (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>{getStepMessage()}</span>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Info */}
            <div className="space-y-2 text-xs text-muted-foreground bg-background/50 p-3 rounded-lg">
              <div className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                <div>
                  <div className="font-semibold text-foreground">
                    {TEST_MODE ? 'Simulated' : 'Smart Contract'} Purchase
                  </div>
                  <div>
                    {TEST_MODE 
                      ? 'Experience the full flow without blockchain transactions'
                      : 'USDC deposited on-chain, credits minted instantly'
                    }
                  </div>
                </div>
              </div>
              {!TEST_MODE && (
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-yellow-500 mt-0.5" />
                  <div>
                    {chain === 'solana' ? (
                      <>You'll need SOL for transaction fees (~0.000005 SOL)</>
                    ) : (
                      <>You'll need ETH for gas fees (~$0.10-0.50)</>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Purchase Button */}
            <Button 
              onClick={handlePurchase} 
              disabled={isProcessing}
              className="w-full bg-gradient-primary text-black font-bold text-lg h-12"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  {getStepMessage()}
                </>
              ) : (
                <>
                  {TEST_MODE ? 'Simulate Purchase' : 'Purchase'} {quantity} Credit{quantity !== 1 ? 's' : ''} ($${totalCost.toFixed(2)} USDC)
                </>
              )}
            </Button>

            {/* Additional Info */}
            <div className="text-xs text-muted-foreground text-center space-y-1">
              <div>• {TEST_MODE ? 'No real payment required' : 'On-chain transaction via ' + (chain === 'solana' ? 'Solana SPL' : 'Base ERC20')}</div>
              <div>• 1 Credit = 1 GOAT Rush (3 questions)</div>
              <div>• {TEST_MODE ? 'Credits added instantly' : 'Non-refundable after blockchain confirmation'}</div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
