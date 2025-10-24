import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWallet } from '@/contexts/WalletContext';
import { QuestionCard } from '@/components/QuestionCard';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import Confetti from 'react-confetti';
import { Trophy, Home, RotateCcw, Clock } from 'lucide-react';
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
  const [userAnswers, setUserAnswers] = useState<string[]>([]);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [gameState, setGameState] = useState<'loading' | 'playing' | 'win' | 'loss'>('loading');
  const [showConfetti, setShowConfetti] = useState(false);
  const [globalTimeLeft, setGlobalTimeLeft] = useState(30);
  const [gameStartTime, setGameStartTime] = useState<number | null>(null);
  const { width, height } = useWindowSize();

  useEffect(() => {
    if (!walletAddress || credits < 1) {
      toast.error('You need at least 1 credit to play!');
      navigate('/');
      return;
    }

    loadQuestions();
  }, []);

  // Watch for balance/points updates from context
  useEffect(() => {
    console.log('Context updated:', { credits, points, walletAddress });
  }, [credits, points, walletAddress]);

  // Global 30-second timer
  useEffect(() => {
    if (gameState !== 'playing' || !gameStartTime) return;

    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - gameStartTime) / 1000);
      const remaining = Math.max(0, 30 - elapsed);
      setGlobalTimeLeft(remaining);

      if (remaining === 0) {
        // Force game end when global timer expires
        handleGlobalTimeout();
      }
    }, 100);

    return () => clearInterval(interval);
  }, [gameState, gameStartTime]);

  const handleGlobalTimeout = async () => {
    const finalCorrect = await verifyAnswers(userAnswers);
    setCorrectAnswers(finalCorrect);
    await endGame(finalCorrect);
  };

  const loadQuestions = async () => {
    try {
      // Fetch questions with IDs only (no answers exposed to client)
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
        correct_answer: '' // Not exposed to client for security
      }));
      
      setQuestions(selected);
      setGameState('playing');
      setGameStartTime(Date.now()); // Start global timer
      setUserAnswers([]);
      setCorrectAnswers(0);
      setGlobalTimeLeft(30);

      // Deduct credit immediately when game starts
      await deductCredit();
    } catch (error) {
      console.error('Error loading questions:', error);
      toast.error('Failed to load questions');
      navigate('/');
    }
  };

  const deductCredit = async () => {
    if (!walletAddress) return;

    try {
      const { data: user, error: fetchError } = await supabase
        .from('users')
        .select('id, credits, total_plays')
        .eq('wallet_address', walletAddress)
        .single();

      if (fetchError) {
        console.error('Error fetching user for credit deduction:', fetchError);
        return;
      }

      if (user) {
        const newCredits = Math.max(0, user.credits - 1);
        const newTotalPlays = user.total_plays + 1;

        console.log('Deducting credit:', {
          oldCredits: user.credits,
          newCredits,
          totalPlays: newTotalPlays
        });

        const { error: updateError } = await supabase
          .from('users')
          .update({ 
            credits: newCredits,
            last_play: new Date().toISOString(),
            total_plays: newTotalPlays
          })
          .eq('id', user.id);

        if (updateError) {
          console.error('Error updating credits:', updateError);
          return;
        }

        // Force context refresh
        await refreshBalance();
      }
    } catch (error) {
      console.error('Error in deductCredit:', error);
    }
  };

  const handleAnswer = async (answer: string) => {
    // Store user's answer
    const newAnswers = [...userAnswers, answer];
    setUserAnswers(newAnswers);

    if (currentQuestion + 1 < questions.length && globalTimeLeft > 0) {
      // Move to next question
      setCurrentQuestion(prev => prev + 1);
    } else {
      // All questions answered or time expired - verify and end game
      const finalCorrect = await verifyAnswers(newAnswers);
      setCorrectAnswers(finalCorrect);
      await endGame(finalCorrect);
    }
  };

  const verifyAnswers = async (answers: string[]): Promise<number> => {
    try {
      // Verify answers server-side to prevent cheating
      const questionIds = questions.map(q => q.id);
      
      const { data, error } = await supabase
        .from('questions')
        .select('id, correct_answer, options')
        .in('id', questionIds);

      if (error) throw error;

      if (!data) {
        console.error('No data returned from database');
        return 0;
      }

      // Create a map for O(1) lookup by question ID
      const correctAnswersMap = new Map(
        data.map(q => [q.id, { correct_answer: q.correct_answer, options: q.options as Record<string, string> }])
      );

      let correct = 0;
      answers.forEach((answer, index) => {
        const questionId = questions[index].id;
        const questionData = correctAnswersMap.get(questionId);
        
        if (questionData) {
          const { correct_answer, options } = questionData;
          
          // Normalize user answer for comparison
          const normalizedAnswer = answer.toLowerCase().trim();
          
          // Normalize the correct answer (could be "A", "a", or full text)
          const normalizedCorrect = correct_answer.toLowerCase().trim();
          
          // Check multiple match scenarios:
          let isMatch = false;
          
          // 1. Direct match (user answer matches correct answer exactly)
          if (normalizedAnswer === normalizedCorrect) {
            isMatch = true;
          }
          
          // 2. If correct_answer is a key like "A", "B", "C", "D"
          // Check if user's answer matches the text value of that key
          if (!isMatch && options && options[correct_answer.toUpperCase()]) {
            const correctAnswerText = options[correct_answer.toUpperCase()].toLowerCase().trim();
            if (normalizedAnswer === correctAnswerText) {
              isMatch = true;
            }
          }
          
          // 3. If user selected a key (like "A") and correct answer is also a key
          if (!isMatch && normalizedAnswer.length === 1 && normalizedCorrect.length === 1) {
            if (normalizedAnswer === normalizedCorrect) {
              isMatch = true;
            }
          }
          
          // 4. If user selected text, check if it matches any option value where the key is the correct answer
          if (!isMatch && options) {
            Object.entries(options).forEach(([key, value]) => {
              if (key.toLowerCase() === normalizedCorrect && value.toLowerCase().trim() === normalizedAnswer) {
                isMatch = true;
              }
            });
          }
          
          // Debug log (view in browser console F12 during play)
          console.log(`Q${index + 1} [${questionId}]:`);
          console.log(`  User answer: '${answer}' (normalized: '${normalizedAnswer}')`);
          console.log(`  Correct answer: '${correct_answer}' (normalized: '${normalizedCorrect}')`);
          console.log(`  Options:`, options);
          console.log(`  Match: ${isMatch}`);
          
          if (isMatch) {
            correct++;
          }
        } else {
          console.error(`No correct answer found for question ID: ${questionId}`);
        }
      });

      // Log final score
      console.log(`Final score: ${correct}/${answers.length} correct`);

      return correct;
    } catch (error) {
      console.error('Error verifying answers:', error);
      return 0;
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
      const { data: user, error: fetchError } = await supabase
        .from('users')
        .select('id, balance, points, streak, total_wins, total_plays')
        .eq('wallet_address', walletAddress)
        .single();

      if (fetchError) {
        console.error('Error fetching user:', fetchError);
        toast.error('Failed to update game results');
        return;
      }

      if (user) {
        // Calculate new values
        const newBalance = Number((user.balance + earnings).toFixed(2));
        const newPoints = won ? user.points + 1 : user.points;
        const newStreak = won ? user.streak + 1 : 0;
        const newTotalWins = won ? user.total_wins + 1 : user.total_wins;

        console.log('Updating user stats:', {
          oldBalance: user.balance,
          newBalance,
          oldPoints: user.points,
          newPoints,
          oldStreak: user.streak,
          newStreak,
          won
        });

        // Update balance, points, streak, and stats
        const updates: any = {
          balance: newBalance,
          points: newPoints,
          streak: newStreak,
          total_wins: newTotalWins,
        };
        
        if (won) {
          updates.last_win = new Date().toISOString();
        }

        const { error: updateError } = await supabase
          .from('users')
          .update(updates)
          .eq('id', user.id);

        if (updateError) {
          console.error('Error updating user:', updateError);
          toast.error('Failed to update your stats');
          return;
        }

        // Record game history
        const { error: historyError } = await supabase
          .from('game_history')
          .insert({
            user_id: user.id,
            wallet_address: walletAddress,
            questions_attempted: 3,
            questions_correct: finalCorrect,
            outcome: won ? 'win' : 'loss',
            earnings,
          });

        if (historyError) {
          console.error('Error recording game history:', historyError);
        }

        // Wait a moment for database to fully commit
        await new Promise(resolve => setTimeout(resolve, 500));

        // Force fresh data fetch with cache busting
        const timestamp = Date.now();
        const { data: updatedUser, error: verifyError } = await supabase
          .from('users')
          .select('balance, points, streak, total_wins')
          .eq('wallet_address', walletAddress)
          .single();

        if (verifyError) {
          console.error('Error verifying update:', verifyError);
        } else {
          console.log('Verified updated user data:', updatedUser);
          console.log('Expected vs Actual:', {
            expectedBalance: newBalance,
            actualBalance: updatedUser.balance,
            expectedPoints: newPoints,
            actualPoints: updatedUser.points,
            match: updatedUser.balance === newBalance && updatedUser.points === newPoints
          });
        }

        // Refresh balance from context (force refresh)
        try {
          await refreshBalance();
          console.log('Context refreshed at:', timestamp);
        } catch (refreshError) {
          console.error('Error refreshing context:', refreshError);
        }

        if (won) {
          toast.success(`🎉 GOAT WIN! +${earnings.toFixed(2)} | Points: ${newPoints}`);
        } else {
          toast.error('Not quite GOAT level... Try again!');
        }
      }
    } catch (error) {
      console.error('Error ending game:', error);
      toast.error('An error occurred. Please refresh the page.');
    }
  };

  const handleReinvest = async () => {
    if (credits < 1) {
      toast.error('Not enough credits!');
      return;
    }
    
    console.log('Reinvesting - Starting new game');
    
    // Force a fresh balance check before starting
    await refreshBalance();
    
    // Reset game
    setCurrentQuestion(0);
    setCorrectAnswers(0);
    setUserAnswers([]);
    setGameState('loading');
    setGameStartTime(null);
    setShowConfetti(false);
    
    // Small delay to ensure state is cleared
    await new Promise(resolve => setTimeout(resolve, 100));
    
    await loadQuestions();
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
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

          {credits >= 1 && (
            <div className="p-4 bg-primary/10 border-2 border-primary rounded-lg">
              <p className="text-sm text-muted-foreground mb-3">
                {gameState === 'win' ? 'Play Again?' : 'Try Again?'} (1 Credit)
              </p>
              <Button 
                onClick={handleReinvest}
                className="bg-gradient-primary text-black font-bold w-full"
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                {gameState === 'win' ? "Yes, Let's GOAT!" : 'Play Again'}
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
      <div className="max-w-2xl w-full space-y-4">
        {/* Global Timer HUD */}
        <div className="bg-gradient-card border-2 border-border rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium text-muted-foreground">Total Time</span>
            </div>
            <span className={`text-2xl font-bold ${globalTimeLeft <= 30 ? 'text-destructive animate-pulse' : 'text-primary'}`}>
              {formatTime(globalTimeLeft)}
            </span>
          </div>
          <Progress 
            value={(globalTimeLeft / 30) * 100} 
            className="h-2"
          />
        </div>

        {/* Question Card */}
        <QuestionCard
          key={currentQuestion} // Force remount for each question
          question={questions[currentQuestion]}
          onAnswer={handleAnswer}
          questionNumber={currentQuestion + 1}
          totalQuestions={3}
        />
      </div>
    </div>
  );
}
