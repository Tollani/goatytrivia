import { useEffect, useState } from 'react';
import { useWallet } from '@/contexts/WalletContext';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Trophy, X, Clock } from 'lucide-react';
import { format } from 'date-fns';

interface HistoryItem {
  id: string;
  outcome: string;
  questions_correct: number;
  questions_attempted: number;
  earnings: number;
  timestamp: string;
}

export function GameHistory() {
  const { walletAddress } = useWallet();
  const [history, setHistory] = useState<HistoryItem[]>([]);

  useEffect(() => {
    if (!walletAddress) return;

    const fetchHistory = async () => {
      const { data } = await supabase
        .from('game_history')
        .select('*')
        .eq('wallet_address', walletAddress)
        .order('timestamp', { ascending: false })
        .limit(10);

      if (data) setHistory(data);
    };

    fetchHistory();
  }, [walletAddress]);

  if (!walletAddress || history.length === 0) {
    return null;
  }

  return (
    <Card className="p-6 bg-gradient-card border-2 border-border">
      <h3 className="text-xl font-bold neon-text mb-4 flex items-center gap-2">
        <Clock className="h-5 w-5" />
        Recent Games
      </h3>
      <div className="space-y-3">
        {history.map((item) => (
          <div 
            key={item.id}
            className={`flex items-center justify-between p-3 rounded-lg border-2 ${
              item.outcome === 'win' 
                ? 'border-primary bg-primary/5' 
                : 'border-destructive bg-destructive/5'
            }`}
          >
            <div className="flex items-center gap-3">
              {item.outcome === 'win' ? (
                <Trophy className="h-5 w-5 text-primary" />
              ) : (
                <X className="h-5 w-5 text-destructive" />
              )}
              <div>
                <p className="font-medium">
                  {item.questions_correct}/{item.questions_attempted} Correct
                </p>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(item.timestamp), 'MMM d, h:mm a')}
                </p>
              </div>
            </div>
            <div className={`font-bold ${item.outcome === 'win' ? 'text-primary' : 'text-destructive'}`}>
              {item.outcome === 'win' ? '+' : ''}{item.earnings > 0 ? `$${item.earnings.toFixed(2)}` : '-'}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
