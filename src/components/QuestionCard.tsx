import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Clock } from 'lucide-react';

interface QuestionCardProps {
  question: {
    id: string;
    text: string;
    options: Record<string, string>;
    correct_answer: string;
    category: string;
  };
  onAnswer: (answer: string) => void;
  questionNumber: number;
  totalQuestions: number;
}

export function QuestionCard({ question, onAnswer, questionNumber, totalQuestions }: QuestionCardProps) {
  const [selectedAnswer, setSelectedAnswer] = useState<string>('');
  const [timeLeft, setTimeLeft] = useState(30);
  const [hasAnswered, setHasAnswered] = useState(false);

  useEffect(() => {
    // Reset state when question changes
    setSelectedAnswer('');
    setTimeLeft(30);
    setHasAnswered(false);
  }, [question.id]);

  useEffect(() => {
    if (timeLeft === 0 && !hasAnswered) {
      handleAutoSubmit();
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, hasAnswered]);

  const handleAutoSubmit = () => {
    if (!selectedAnswer) {
      setSelectedAnswer('A'); // Default to A if no selection
    }
    submitAnswer(selectedAnswer || 'A');
  };

  const submitAnswer = (answer: string) => {
    if (hasAnswered) return;
    
    setHasAnswered(true);
    
    // Short delay for visual feedback, then advance
    setTimeout(() => {
      onAnswer(answer);
    }, 500);
  };

  const handleSubmit = () => {
    if (!selectedAnswer) return;
    submitAnswer(selectedAnswer);
  };

  const getTimerColor = () => {
    if (timeLeft <= 5) return 'bg-destructive';
    if (timeLeft <= 15) return 'bg-yellow-500';
    return 'bg-primary';
  };

  return (
    <Card className="p-4 md:p-8 bg-gradient-card border-2 transition-all animate-fade-in">
      <div className="space-y-4 md:space-y-6">
        {/* Progress and Timer Bar */}
        <div className="space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs md:text-sm font-medium text-muted-foreground">
                Question {questionNumber}/{totalQuestions}
              </span>
              <span className="px-2 py-1 text-xs bg-accent text-accent-foreground rounded">
                {question.category}
              </span>
            </div>
            <div className={`flex items-center gap-2 ${timeLeft <= 5 ? 'text-destructive animate-pulse' : timeLeft <= 15 ? 'text-yellow-500' : 'text-primary'}`}>
              <Clock className="h-4 w-4 md:h-5 md:w-5" />
              <span className="text-xl md:text-2xl font-bold">{timeLeft}s</span>
            </div>
          </div>
          
          {/* Timer Progress Bar */}
          <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all duration-1000 ease-linear ${getTimerColor()}`}
              style={{ width: `${(timeLeft / 30) * 100}%` }}
            />
          </div>
        </div>

        <h2 className="text-lg md:text-2xl font-bold neon-text leading-tight">
          {question.text}
        </h2>

        <RadioGroup 
          value={selectedAnswer} 
          onValueChange={setSelectedAnswer}
          disabled={hasAnswered}
          className="space-y-2 md:space-y-3"
        >
          {Object.entries(question.options).map(([key, value]) => {
            const isSelected = key === selectedAnswer;
            const optionClass = isSelected ? 'border-primary bg-primary/5' : 'border-border';

            return (
              <div 
                key={key} 
                className={`flex items-center space-x-2 md:space-x-3 p-3 md:p-4 rounded-lg border-2 transition-all cursor-pointer hover:border-primary hover:bg-primary/5 ${optionClass}`}
                onClick={() => !hasAnswered && setSelectedAnswer(key)}
              >
                <RadioGroupItem value={key} id={key} className="border-primary shrink-0" />
                <Label htmlFor={key} className="cursor-pointer flex-1 text-sm md:text-base">
                  <span className="font-bold text-primary">{key}:</span> {value}
                </Label>
              </div>
            );
          })}
        </RadioGroup>

        <Button
          onClick={handleSubmit}
          disabled={!selectedAnswer || hasAnswered}
          className="w-full bg-gradient-primary text-black font-bold text-base md:text-lg h-11 md:h-12 neon-glow"
        >
          {hasAnswered ? 'Next...' : 'Submit Answer'}
        </Button>
      </div>
    </Card>
  );
}
