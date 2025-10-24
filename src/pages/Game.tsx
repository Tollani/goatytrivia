import { useState, useEffect, useRef } from 'react';
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

interface GameSession {
  sessionId: string;
  creditDeducted: boolean;
  gameEnded: boolean;
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
  
  // Use refs to prevent double execution
  const gameSessionRef = useRef<GameSession>({
    sessionId: '',
    creditDeducted: false,
    gameEnded: false
  });
  const isProcessingRef = useRef(false);

  useEffect(() => {
    if (!walletAddress || credits < 1) {
      toast.error('You need at least 1 credit to play!');
      navigate('/');
      return;
    }

    initializeGame();
  }, []);

  // Global 30-second timer
  useEffect(() => {
    if (gameState !== 'playing' || !gameStartTime) return;

    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - gameStartTime) / 1000);
      const remaining = Math.max(0, 30 - elapsed);
      setGlobalTimeLeft(remaining);

      if (remaining === 0 && !gameSessionRef.current.gameEnded) {
        handleGlobalTimeout();
      }
    }, 100);

    return () => clearInterval(interval);
  }, [gameState, gameStartTime]);

  const initializeGame = async () => {
    // Generate unique session ID
    gameSessionRef.current = {
      sessionId: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      creditDeducted: false,
      gameEnded: false
    };

    await loadQuestions();
  };

  const handleGlobalTimeout = async () => {
    if (isProcessingRef.current || gameSessionRef.current.gameEnded) return;
    
    isProcessingRef.current = true;
    const finalCorrect = await verifyAnswers(userAnswers);
    setCorrectAnswers(finalCorrect);
    await endGame(finalCorrect);
    isProcessingRef.current = false;
  };

  const loadQuestions = async () => {
    try {
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
        correct_answer: ''
      }));
      
      setQuestions(selected);
      setUserAnswers([]);
      setCorrectAnswers(0);
      setGlobalTimeLeft(30);
      
      // Deduct credit FIRST before starting the game
      const creditDeducted = await deductCreditWithRetry();
      
      if (!creditDeducted) {
        toast.error('Failed to start game. Please try again.');
        navigate('/');
        return;
      }

      // Only start game after successful credit deduction
      setGameState('playing');
      setGameStartTime(Date.now());
      
    } catch (error) {
      console.error('Error loading questions:', error);
      toast.error('Failed to load questions');
      navigate('/');
    }
  };

  const deductCreditWithRetry = async (maxRetries = 3): Promise<boolean> => {
    if (!walletAddress || gameSessionRef.current.creditDeducted) {
      return gameSessionRef.current.creditDeducted;
    }

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`💳 Credit deduction attempt ${attempt}/${maxRetries}`);

        // Use a transaction-like approach: fetch latest, then update with check
        const { data: user, error: fetchError } = await supabase
          .from('users')
          .select('id, credits, total_plays')
          .eq('wallet_address', walletAddress)
          .single();

        if (fetchError) {
          console.error(`❌ Fetch error on attempt ${attempt}:`, fetchError);
          if (attempt < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, 500 * attempt));
            continue;
          }
          return false;
        }

        if (!user || user.credits < 1) {
          console.error('❌ Insufficient credits');
          toast.error('Insufficient credits');
          return false;
        }

        const newCredits = user.credits - 1;
        const newTotalPlays = user.total_plays + 1;

        console.log('💾 Deducting credit:', {
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
          .eq('id', user.id)
          .eq('credits', user.credits); // Optimistic locking - only update if credits haven't changed

        if (updateError) {
          console.error(`❌ Update error on attempt ${attempt}:`, updateError);
          if (attempt < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, 500 * attempt));
            continue;
          }
          return false;
        }

        // Verify the deduction succeeded
        const verified = await verifyDatabaseUpdate(
          walletAddress,
          { credits: newCredits },
          3,
          400
        );

        if (verified) {
          gameSessionRef.current.creditDeducted = true;
          
          // Refresh balance in context
          await refreshBalance();
          
          console.log('✅ Credit deducted successfully');
          return true;
        }

        if (attempt < maxRetries) {
          console.warn(`⚠️ Verification failed on attempt ${attempt}, retrying...`);
          await new Promise(resolve => setTimeout(resolve, 500 * attempt));
        }
        
      } catch (error) {
        console.error(`❌ Exception on attempt ${attempt}:`, error);
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 500 * attempt));
          continue;
        }
        return false;
      }
    }

    return false;
  };

  const handleAnswer = async (answer: string) => {
    if (gameSessionRef.current.gameEnded) return;

    const newAnswers = [...userAnswers, answer];
    setUserAnswers(newAnswers);

    if (currentQuestion + 1 < questions.length && globalTimeLeft > 0) {
      setCurrentQuestion(prev => prev + 1);
    } else {
      if (isProcessingRef.current) return;
      
      isProcessingRef.current = true;
      const finalCorrect = await verifyAnswers(newAnswers);
      setCorrectAnswers(finalCorrect);
      await endGame(finalCorrect);
      isProcessingRef.current = false;
    }
  };

  const verifyAnswers = async (answers: string[]): Promise<number> => {
    try {
      const questionIds = questions.map(q => q.id);
      
      const { data, error } = await supabase
        .from('questions')
        .select('id, correct_answer, options')
        .in('id', questionIds);

      if (error) throw error;
      if (!data) return 0;

      const correctAnswersMap = new Map(
        data.map(q => [q.id, { correct_answer: q.correct_answer, options: q.options as Record<string, string> }])
      );

      let correct = 0;
      answers.forEach((answer, index) => {
        const questionId = questions[index].id;
        const questionData = correctAnswersMap.get(questionId);
        
        if (questionData && isAnswerCorrect(answer, questionData.correct_answer, questionData.options)) {
          correct++;
        }
      });

      console.log(`✅ Verified answers: ${correct}/${answers.length} correct`);
      return correct;
    } catch (error) {
      console.error('❌ Error verifying answers:', error);
      return 0;
    }
  };

  const isAnswerCorrect = (
    userAnswer: string,
    correctAnswer: string,
    options: Record<string, string>
  ): boolean => {
    const normalizedUser = userAnswer.toLowerCase().trim();
    const normalizedCorrect = correctAnswer.toLowerCase().trim();

    // Direct match
    if (normalizedUser === normalizedCorrect) return true;

    // User answered with option text, correct answer is key
    if (options[correctAnswer.toUpperCase()]) {
      const correctText = options[correctAnswer.toUpperCase()].toLowerCase().trim();
      if (normalizedUser === correctText) return true;
    }

    // User answered with key, correct answer might be text
    if (normalizedUser.length === 1 && options[normalizedUser.toUpperCase()]) {
      const userText = options[normalizedUser.toUpperCase()].toLowerCase().trim();
      if (userText === normalizedCorrect) return true;
    }

    // Cross-check all options
    for (const [key, value] of Object.entries(options)) {
      const optionKey = key.toLowerCase();
      const optionValue = value.toLowerCase().trim();
      
      if (optionKey === normalizedCorrect && optionValue === normalizedUser) return true;
      if (optionValue === normalizedCorrect && optionKey === normalizedUser) return true;
    }

    return false;
  };

  const endGame = async (finalCorrect: number): Promise<void> => {
    if (!walletAddress || gameSessionRef.current.gameEnded) {
      console.log('⚠️ Game already ended or no wallet address');
      return;
    }

    // Mark game as ended immediately to prevent double execution
    gameSessionRef.current.gameEnded = true;

    const won = finalCorrect === 3;
    const earnings = won ? 2.00 : 0;

    console.log('🎮 ENDING GAME:', { won, earnings, finalCorrect });

    try {
      // Attempt to update with retries
      const success = await updateGameResultsWithRetry(won, earnings, finalCorrect);

      if (!success) {
        toast.error('Failed to save game results. Please contact support.');
        setGameState('loss');
        return;
      }

      // Set game state after successful update
      setGameState(won ? 'win' : 'loss');
      
      if (won) {
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 5000);
        toast.success(`🎉 GOAT WIN! +$${earnings.toFixed(2)} earned!`);
      } else {
        toast.error('Not quite GOAT level... Try again!');
      }

    } catch (error) {
      console.error('❌ Critical error ending game:', error);
      toast.error('An error occurred. Please refresh and contact support if balance is incorrect.');
      setGameState('loss');
    }
  };

  const updateGameResultsWithRetry = async (
    won: boolean,
    earnings: number,
    finalCorrect: number,
    maxRetries = 3
  ): Promise<boolean> => {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`💾 Update attempt ${attempt}/${maxRetries}`);

        // Fetch current user state
        const { data: user, error: fetchError } = await supabase
          .from('users')
          .select('id, balance, points, streak, total_wins, total_plays')
          .eq('wallet_address', walletAddress)
          .single();

        if (fetchError) {
          console.error(`❌ Fetch error on attempt ${attempt}:`, fetchError);
          if (attempt < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, 500 * attempt));
            continue;
          }
          return false;
        }

        if (!user) {
          console.error('❌ User not found');
          return false;
        }

        // Calculate new values with precision
        const newBalance = Number((user.balance + earnings).toFixed(2));
        const newPoints = won ? user.points + 1 : user.points;
        const newStreak = won ? user.streak + 1 : 0;
        const newTotalWins = won ? user.total_wins + 1 : user.total_wins;

        console.log('📊 Calculated updates:', {
          balance: `${user.balance} → ${newBalance} (+${earnings})`,
          points: `${user.points} → ${newPoints}`,
          streak: `${user.streak} → ${newStreak}`,
          wins: `${user.total_wins} → ${newTotalWins}`
        });

        // Build update object
        const updates: any = {
          balance: newBalance,
          points: newPoints,
          streak: newStreak,
          total_wins: newTotalWins,
        };
        
        if (won) {
          updates.last_win = new Date().toISOString();
        }

        // Perform atomic update with optimistic locking
        const { error: updateError } = await supabase
          .from('users')
          .update(updates)
          .eq('id', user.id)
          .eq('balance', user.balance) // Only update if balance hasn't changed
          .eq('points', user.points);   // Only update if points haven't changed

        if (updateError) {
          console.error(`❌ Update error on attempt ${attempt}:`, updateError);
          if (attempt < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, 500 * attempt));
            continue;
          }
          return false;
        }

        // Verify the update with multiple checks
        const verified = await verifyDatabaseUpdate(
          walletAddress,
          { balance: newBalance, points: newPoints, streak: newStreak },
          5, // More verification attempts
          300
        );

        if (!verified) {
          console.warn(`⚠️ Verification failed on attempt ${attempt}`);
          if (attempt < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, 500 * attempt));
            continue;
          }
          return false;
        }

        // Record game history (non-critical, don't fail if this errors)
        try {
          await supabase.from('game_history').insert({
            user_id: user.id,
            wallet_address: walletAddress,
            questions_attempted: 3,
            questions_correct: finalCorrect,
            outcome: won ? 'win' : 'loss',
            earnings,
          });
        } catch (historyError) {
          console.warn('⚠️ Failed to record history:', historyError);
        }

        // Force context refresh with retry
        let refreshAttempts = 0;
        while (refreshAttempts < 3) {
          try {
            await refreshBalance();
            console.log('✅ Context refreshed successfully');
            break;
          } catch (refreshError) {
            console.error(`⚠️ Refresh attempt ${refreshAttempts + 1} failed:`, refreshError);
            refreshAttempts++;
            if (refreshAttempts < 3) {
              await new Promise(resolve => setTimeout(resolve, 300));
            }
          }
        }

        console.log('✅ Game results saved successfully');
        return true;

      } catch (error) {
        console.error(`❌ Exception on attempt ${attempt}:`, error);
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 500 * attempt));
          continue;
        }
        return false;
      }
    }

    return false;
  };

  const verifyDatabaseUpdate = async (
    wallet: string,
    expectedValues: Record<string, number>,
    maxAttempts = 5,
    delayMs = 300
  ): Promise<boolean> => {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const { data, error } = await supabase
          .from('users')
          .select('balance, points, streak, credits')
          .eq('wallet_address', wallet)
          .single();

        if (error) {
          console.error(`❌ Verification attempt ${attempt} error:`, error);
          if (attempt < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, delayMs));
            continue;
          }
          return false;
        }

        if (!data) {
          console.error('❌ No data returned in verification');
          return false;
        }

        // Check all expected values
        let allMatch = true;
        for (const [key, expectedValue] of Object.entries(expectedValues)) {
          const actualValue = data[key as keyof typeof data] as number;
          
          // For floating point (balance), allow small difference
          const matches = key === 'balance'
            ? Math.abs(actualValue - expectedValue) < 0.01
            : actualValue === expectedValue;

          if (!matches) {
            console.log(`⚠️ Verification attempt ${attempt}: ${key} mismatch (expected: ${expectedValue}, got: ${actualValue})`);
            allMatch = false;
          }
        }

        if (allMatch) {
          console.log(`✅ Verification successful on attempt ${attempt}`);
          return true;
        }

        if (attempt < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }

      } catch (error) {
        console.error(`❌ Verification attempt ${attempt} exception:`, error);
        if (attempt < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }
      }
    }

    console.error('❌ Verification failed after all attempts');
    return false;
  };

  const handleReinvest = async () => {
    if (credits < 1) {
      toast.error('Not enough credits!');
      return;
    }
    
    console.log('🔄 Starting new game');
    
    // Reset all state
    setCurrentQuestion(0);
    setCorrectAnswers(0);
    setUserAnswers([]);
    setGameState('loading');
    setGameStartTime(null);
    setShowConfetti(false);
    isProcessingRef.current = false;
    
    // Reset session
    gameSessionRef.current = {
      sessionId: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      creditDeducted: false,
      gameEnded: false
    };
    
    // Refresh balance before starting
    await refreshBalance();
    await new Promise(resolve => setTimeout(resolve, 200));
    
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
        <div className="bg-gradient-card border-2 border-border rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium text-muted-foreground">Total Time</span>
            </div>
            <span className={`text-2xl font-bold ${globalTimeLeft <= 10 ? 'text-destructive animate-pulse' : 'text-primary'}`}>
              {formatTime(globalTimeLeft)}
            </span>
          </div>
          <Progress 
            value={(globalTimeLeft / 30) * 100} 
            className="h-2"
          />
        </div>

        <QuestionCard
          key={currentQuestion}
          question={questions[currentQuestion]}
          onAnswer={handleAnswer}
          questionNumber={currentQuestion + 1}
          totalQuestions={3}
        />
      </div>
    </div>
  );
}
