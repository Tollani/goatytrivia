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
  onAnswer: (answer: string, isCorrect: boolean) => void;
  questionNumber: number;
}

export function QuestionCard({ question, onAnswer, questionNumber }: QuestionCardProps) {
  const [selectedAnswer, setSelectedAnswer] = useState<string>('');
  const [timeLeft, setTimeLeft] = useState(30);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);

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
    setShowFeedback(true);
    
    const isCorrect = answer === question.correct_answer;
    
    setTimeout(() => {
      onAnswer(answer, isCorrect);
    }, 1500);
  };

  const handleSubmit = () => {
    if (!selectedAnswer) return;
    submitAnswer(selectedAnswer);
  };

  const getFeedbackClass = () => {
    if (!showFeedback) return '';
    return selectedAnswer === question.correct_answer 
      ? 'border-green-500 bg-green-500/10' 
      : 'border-destructive bg-destructive/10';
  };

  return (
    <Card className={`p-4 md:p-8 bg-gradient-card border-2 transition-all ${getFeedbackClass()}`}>
      <div className="space-y-4 md:space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs md:text-sm font-medium text-muted-foreground">
              Question {questionNumber}/3
            </span>
            <span className="px-2 py-1 text-xs bg-accent text-accent-foreground rounded">
              {question.category}
            </span>
          </div>
          <div className={`flex items-center gap-2 ${timeLeft <= 1 ? 'text-destructive animate-pulse' : 'text-primary'}`}>
            <Clock className="h-4 w-4 md:h-5 md:w-5" />
            <span className="text-xl md:text-2xl font-bold animate-countdown">{timeLeft}s</span>
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
            const isCorrect = key === question.correct_answer;
            const isSelected = key === selectedAnswer;
            
            let optionClass = 'border-border';
            if (showFeedback) {
              if (isCorrect) {
                optionClass = 'border-green-500 bg-green-500/10';
              } else if (isSelected && !isCorrect) {
                optionClass = 'border-destructive bg-destructive/10';
              }
            } else if (isSelected) {
              optionClass = 'border-primary bg-primary/5';
            }

            return (
              <div 
                key={key} 
                className={`flex items-center space-x-2 md:space-x-3 p-3 md:p-4 rounded-lg border-2 transition-all cursor-pointer hover:border-primary ${optionClass}`}
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
