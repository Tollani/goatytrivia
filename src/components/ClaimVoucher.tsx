import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useWallet } from '@/contexts/WalletContext';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Copy, Trophy, ExternalLink } from 'lucide-react';
import { Input } from '@/components/ui/input';

export function ClaimVoucher() {
  const { walletAddress, chain, points, streak, refreshBalance } = useWallet();
  const [isOpen, setIsOpen] = useState(false);
  const [voucherCode, setVoucherCode] = useState('');
  const [isClaiming, setIsClaiming] = useState(false);

  const canClaim = points >= 10 || streak >= 10;

  const handleClaim = async () => {
    if (!canClaim) {
      toast.error('Need 10+ points or 10+ streak to claim!');
      return;
    }

    setIsClaiming(true);
    try {
      // Get user ID first
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('wallet_address', walletAddress!)
        .single();

      if (userError || !user) throw new Error('User not found');

      const code = `GOAT-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
      
      const { error } = await supabase.from('claims').insert({
        user_id: user.id,
        wallet_address: walletAddress!,
        chain: chain!,
        code,
        amount: Math.floor(points / 10) * 10, // $10 per 10 points
        points_redeemed: points,
        streak_redeemed: streak >= 10,
        status: 'pending',
      });

      if (error) throw error;

      // Reset points/streak
      await supabase
        .from('users')
        .update({ points: 0, streak: 0 })
        .eq('wallet_address', walletAddress!);

      setVoucherCode(code);
      await refreshBalance();
      toast.success('GOAT Voucher Generated! 🎉');
    } catch (error: any) {
      console.error('Claim error:', error);
      toast.error('Failed to generate voucher');
    } finally {
      setIsClaiming(false);
    }
  };

  const copyCode = () => {
    navigator.clipboard.writeText(voucherCode);
    toast.success('Voucher code copied!');
  };

  return (
    <>
      <Button 
        onClick={() => setIsOpen(true)}
        disabled={!canClaim}
        className={canClaim ? 'bg-gradient-primary text-black font-bold neon-glow-strong animate-pulse' : 'opacity-50'}
      >
        <Trophy className="mr-2 h-5 w-5" />
        Claim GOAT Voucher
        {canClaim && ' 🔥'}
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="bg-gradient-card border-primary max-w-md">
          <DialogHeader>
            <DialogTitle className="neon-text text-2xl">
              {voucherCode ? '🎉 Voucher Ready!' : 'Claim Your GOAT Voucher'}
            </DialogTitle>
          </DialogHeader>

          {!voucherCode ? (
            <div className="space-y-6">
              <div className="text-center p-6 bg-primary/10 rounded-lg border-2 border-primary">
                <Trophy className="h-16 w-16 mx-auto text-primary mb-4 neon-glow" />
                <div className="text-3xl font-bold neon-text mb-2">
                  ${Math.floor(points / 10) * 10} USDC
                </div>
                <div className="text-sm text-muted-foreground">
                  Redeemable Balance
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Current Points:</span>
                  <span className="font-bold neon-text">{points}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Current Streak:</span>
                  <span className="font-bold text-accent">{streak}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Wallet:</span>
                  <span className="font-mono text-xs">{walletAddress}</span>
                </div>
              </div>

              <Button 
                onClick={handleClaim}
                disabled={isClaiming || !canClaim}
                className="w-full bg-gradient-primary text-black font-bold text-lg h-12"
              >
                {isClaiming ? 'Generating...' : `Claim Voucher (Reset Points/Streak)`}
              </Button>

              <p className="text-xs text-muted-foreground text-center">
                Points & streak will reset to 0 after claiming
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="p-6 bg-primary/10 rounded-lg border-2 border-primary">
                <div className="text-sm text-muted-foreground mb-2">Your Voucher Code:</div>
                <div className="flex items-center gap-2 mb-4">
                  <Input 
                    value={voucherCode}
                    readOnly
                    className="bg-background font-mono text-sm"
                  />
                  <Button size="icon" variant="outline" onClick={copyCode}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <div className="text-xs text-muted-foreground">
                  Wallet: {walletAddress}
                </div>
              </div>

              <div className="space-y-3 text-sm bg-accent/10 p-4 rounded-lg">
                <div className="font-bold text-accent">📋 Redemption Steps:</div>
                <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                  <li>Join GOATY Discord server</li>
                  <li>Go to #claims channel</li>
                  <li>Paste your voucher code + wallet address</li>
                  <li>Admin will verify & send USDC within 24h</li>
                </ol>
              </div>

              <Button 
                onClick={() => window.open('https://discord.gg/3mPqT6Pt', '_blank')}
                className="w-full bg-gradient-primary text-black font-bold"
              >
                Open Discord to Redeem
                <ExternalLink className="ml-2 h-4 w-4" />
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
