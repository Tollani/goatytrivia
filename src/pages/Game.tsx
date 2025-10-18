import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWallet } from '@/contexts/WalletContext';
import { QuestionCard } from '@/components/QuestionCard';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import Confetti from 'react-confetti';
import { Trophy, X, Home, RotateCcw } from 'lucide-react';
import { useWindowSize } from 'react-use';

interface Question {
  id: string;
  text: string;
  options: Record<string, string>;
  correct_answer: string;
  category: string;
}

export default function Game() {
  const navigate = useNavigate();
  const { walletAddress, credits, points, streak, refreshBalance } = useWallet();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [gameState, setGameState] = useState<'loading' | 'playing' | 'win' | 'loss'>('loading');
  const [showConfetti, setShowConfetti] = useState(false);
  const { width, height } = useWindowSize();

  useEffect(() => {
    if (!walletAddress || credits < 1) {
      toast.error('You need at least 1 credit to play!');
      navigate('/');
      return;
    }

    loadQuestions();
  }, []);

  const loadQuestions = async () => {
    try {
      // Use questions_public view to prevent answer exposure
      const { data, error } = await supabase
        .from('questions_public')
        .select('*')
        .limit(100);

      if (error) throw error;

      if (!data || data.length < 3) {
        toast.error('Not enough questions available');
        navigate('/');
        return;
      }

      // Randomly select 3 questions
      const shuffled = data.sort(() => Math.random() - 0.5);
      const selected = shuffled.slice(0, 3).map(q => ({
        ...q,
        options: q.options as Record<string, string>,
        correct_answer: '' // Not available from public view
      }));
      
      setQuestions(selected);
      setGameState('playing');

      // Deduct credit
      await deductCredit();
    } catch (error) {
      console.error('Error loading questions:', error);
      toast.error('Failed to load questions');
      navigate('/');
    }
  };

  const deductCredit = async () => {
    if (!walletAddress) return;

    const { data: user } = await supabase
      .from('users')
      .select('id, credits, total_plays')
      .eq('wallet_address', walletAddress)
      .single();

    if (user) {
      await supabase
        .from('users')
        .update({ 
          credits: Math.max(0, user.credits - 1),
          last_play: new Date().toISOString(),
          total_plays: user.total_plays + 1
        })
        .eq('id', user.id);

      await refreshBalance();
    }
  };

  const handleAnswer = async (answer: string, isCorrect: boolean) => {
    if (isCorrect) {
      setCorrectAnswers(prev => prev + 1);
    }

    if (currentQuestion + 1 < questions.length) {
      setCurrentQuestion(prev => prev + 1);
    } else {
      // Game over
      const finalCorrect = correctAnswers + (isCorrect ? 1 : 0);
      await endGame(finalCorrect);
    }
  };

  const endGame = async (finalCorrect: number) => {
    if (!walletAddress) return;

    const won = finalCorrect === 3;
    const earnings = won ? 2.00 : 0;

    setGameState(won ? 'win' : 'loss');
    
    if (won) {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 5000);
    }

    try {
      // Get user data
      const { data: user } = await supabase
        .from('users')
        .select('id, balance, points, streak, total_wins')
        .eq('wallet_address', walletAddress)
        .single();

      if (user) {
        // Update balance, points, streak, and stats
        const updates: any = {
          balance: user.balance + earnings,
        };
        
        if (won) {
          updates.total_wins = user.total_wins + 1;
          updates.points = user.points + 1;
          updates.streak = user.streak + 1;
          updates.last_win = new Date().toISOString();
        } else {
          updates.streak = 0; // Reset streak on loss
        }

        await supabase
          .from('users')
          .update(updates)
          .eq('id', user.id);

        // Record game history
        await supabase.from('game_history').insert({
          user_id: user.id,
          wallet_address: walletAddress,
          questions_attempted: 3,
          questions_correct: finalCorrect,
          outcome: won ? 'win' : 'loss',
          earnings,
        });

        await refreshBalance();

        if (won) {
          toast.success(`🎉 GOAT WIN! +$${earnings.toFixed(2)}`);
        } else {
          toast.error('Not quite GOAT level... Try again!');
        }
      }
    } catch (error) {
      console.error('Error ending game:', error);
    }
  };

  const handleReinvest = async () => {
    if (credits < 1) {
      toast.error('Not enough credits!');
      return;
    }
    
    // Reset game
    setCurrentQuestion(0);
    setCorrectAnswers(0);
    setGameState('loading');
    await loadQuestions();
  };

  if (gameState === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-dark flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin text-6xl">🐐</div>
          <p className="text-xl neon-text">Loading GOAT Questions...</p>
        </div>
      </div>
    );
  }

  if (gameState === 'win' || gameState === 'loss') {
    return (
      <div className="min-h-screen bg-gradient-dark flex items-center justify-center p-4 overflow-x-hidden">
        {showConfetti && <Confetti width={width} height={height} />}
        
        <div className="max-w-md w-full space-y-4 md:space-y-6 text-center">
          <div className="text-6xl md:text-8xl">
            {gameState === 'win' ? <Trophy className="h-24 w-24 md:h-32 md:w-32 mx-auto text-primary neon-glow-strong" /> : '😔'}
          </div>
          
          <h2 className={`text-2xl md:text-4xl font-bold ${gameState === 'win' ? 'neon-text' : 'text-destructive'}`}>
            {gameState === 'win' ? '🎉 GOAT STATUS!' : 'Not Quite...'}
          </h2>
          
          <p className="text-lg md:text-xl text-foreground">
            You got <span className="neon-text font-bold">{correctAnswers}/3</span> correct
          </p>

          {gameState === 'win' && (
            <p className="text-lg text-primary">
              +$2.00 added to your balance!
            </p>
          )}

          {gameState === 'win' && credits >= 1 && (
            <div className="p-4 bg-primary/10 border-2 border-primary rounded-lg">
              <p className="text-sm text-muted-foreground mb-3">
                Play Again? (1 Credit)
              </p>
              <Button 
                onClick={handleReinvest}
                className="bg-gradient-primary text-black font-bold w-full"
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                Yes, Let's GOAT!
              </Button>
            </div>
          )}

          <div className="flex gap-4">
            <Button 
              onClick={() => navigate('/')}
              variant="outline"
              className="flex-1 neon-border"
            >
              <Home className="mr-2 h-4 w-4" />
              Home
            </Button>
            {gameState === 'win' && points >= 10 && (
              <Button 
                onClick={() => toast.info('Join Discord to claim your voucher!')}
                className="flex-1 bg-gradient-primary text-black font-bold"
              >
                Claim Voucher
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-dark flex items-center justify-center p-3 md:p-4 overflow-x-hidden">
      <div className="max-w-2xl w-full">
        <QuestionCard
          question={questions[currentQuestion]}
          onAnswer={handleAnswer}
          questionNumber={currentQuestion + 1}
        />
      </div>
    </div>
  );
}
