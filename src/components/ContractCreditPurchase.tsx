import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useWallet } from '@/contexts/WalletContext';
import { useAccount } from 'wagmi';
import { useContractPurchase } from '@/hooks/useContractPurchase';
import { useSolanaPurchase } from '@/hooks/useSolanaPurchase';
import { DollarSign, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export function ContractCreditPurchase() {
  const { walletAddress, chain, isConnected, refreshBalance } = useWallet();
  const { address: evmAddress } = useAccount();
  const [isOpen, setIsOpen] = useState(false);
  const [quantity, setQuantity] = useState(1);

  const handleOpen = () => {
    if (!isConnected) {
      toast.error('Please connect your wallet first');
      return;
    }
    setIsOpen(true);
  };

  const handleSuccess = async () => {
    await refreshBalance();
    setIsOpen(false);
    setQuantity(1);
  };

  // Base (EVM) purchase hook
  const {
    executePurchase: executeEvmPurchase,
    isProcessing: isEvmProcessing,
    step: evmStep,
    buyTxHash,
    verifyAndCredit,
  } = useContractPurchase(quantity, handleSuccess);

  // Solana purchase hook
  const {
    executePurchase: executeSolanaPurchase,
    isProcessing: isSolanaProcessing,
  } = useSolanaPurchase(quantity, handleSuccess);

  // Watch for successful EVM purchase
  if (buyTxHash && evmStep === 'buying') {
    verifyAndCredit(buyTxHash);
  }

  const handlePurchase = async () => {
    if (quantity < 1 || quantity > 10) {
      toast.error('Quantity must be between 1-10');
      return;
    }

    if (chain === 'solana') {
      await executeSolanaPurchase();
    } else if (chain === 'base') {
      await executeEvmPurchase();
    } else {
      toast.error('Unsupported chain');
    }
  };

  const isProcessing = isEvmProcessing || isSolanaProcessing;
  const totalCost = quantity * 1.0;

  const getStepMessage = () => {
    if (isSolanaProcessing) return 'Processing Solana transaction...';
    if (evmStep === 'approving') return 'Approving USDC...';
    if (evmStep === 'buying') return 'Purchasing credits...';
    if (evmStep === 'verifying') return 'Verifying on-chain...';
    return 'Ready to purchase';
  };

  return (
    <>
      <Button 
        onClick={handleOpen} 
        className="bg-gradient-primary text-black font-bold neon-glow"
      >
        <DollarSign className="mr-2 h-5 w-5" />
        Buy GOAT Credits (On-Chain)
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="bg-gradient-card border-primary max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="neon-text text-xl md:text-2xl flex items-center gap-2 flex-wrap">
              Buy GOAT Credits
              <Badge variant="outline" className="text-xs">
                {chain === 'solana' ? 'Solana SPL' : 'Base ERC20'}
              </Badge>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 md:space-y-6">
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

            {/* Status Messages */}
            {isProcessing && (
              <div className="p-3 bg-accent/10 rounded-lg border border-accent">
                <div className="flex items-center gap-2 text-sm">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>{getStepMessage()}</span>
                </div>
              </div>
            )}

            {/* Info */}
            <div className="space-y-2 text-xs text-muted-foreground bg-background/50 p-3 rounded-lg">
              <div className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                <div>
                  <div className="font-semibold text-foreground">Smart Contract Purchase</div>
                  <div>USDC deposited on-chain, credits minted instantly</div>
                </div>
              </div>
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
                `Purchase ${quantity} Credit${quantity !== 1 ? 's' : ''} ($${totalCost.toFixed(2)} USDC)`
              )}
            </Button>

            {/* Additional Info */}
            <div className="text-xs text-muted-foreground text-center space-y-1">
              <div>• On-chain transaction via {chain === 'solana' ? 'Solana SPL' : 'Base ERC20'}</div>
              <div>• 1 Credit = 1 GOAT Rush (3 questions)</div>
              <div>• Non-refundable after blockchain confirmation</div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
