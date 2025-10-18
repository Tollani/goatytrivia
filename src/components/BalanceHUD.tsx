import { useWallet } from '@/contexts/WalletContext';
import { Card } from '@/components/ui/card';
import { DollarSign, Zap, Trophy, Flame } from 'lucide-react';

export function BalanceHUD() {
  const { balance, credits, points, streak } = useWallet();

  console.log('📊 BalanceHUD render:', { balance, credits, points, streak });

  return (
    <Card className="bg-gradient-card border-2 border-primary p-3 md:p-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <div className="flex flex-col items-center p-2">
          <div className="flex items-center gap-1 text-primary mb-1">
            <DollarSign className="h-4 w-4" />
            <span className="text-xs font-semibold">Balance</span>
          </div>
          <div className="text-xl md:text-2xl font-bold neon-text">
            ${balance.toFixed(2)}
          </div>
        </div>
        
        <div className="flex flex-col items-center p-2">
          <div className="flex items-center gap-1 text-accent mb-1">
            <Zap className="h-4 w-4" />
            <span className="text-xs font-semibold">Credits</span>
          </div>
          <div className="text-xl md:text-2xl font-bold text-accent">
            {credits}
          </div>
        </div>

        <div className="flex flex-col items-center p-2">
          <div className="flex items-center gap-1 text-secondary mb-1">
            <Trophy className="h-4 w-4" />
            <span className="text-xs font-semibold">Points</span>
          </div>
          <div className="text-xl md:text-2xl font-bold text-secondary">
            {points}
          </div>
        </div>

        <div className="flex flex-col items-center p-2">
          <div className="flex items-center gap-1 text-orange-500 mb-1">
            <Flame className="h-4 w-4" />
            <span className="text-xs font-semibold">Streak</span>
          </div>
          <div className="text-xl md:text-2xl font-bold text-orange-500">
            {streak}
          </div>
        </div>
      </div>
    </Card>
  );
}
