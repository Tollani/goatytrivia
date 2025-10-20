-- Drop constraint without validation
ALTER TABLE questions DROP CONSTRAINT questions_correct_answer_check;

-- Update existing rows to lowercase
UPDATE questions 
SET correct_answer = LOWER(correct_answer);

-- Add new constraint for lowercase
ALTER TABLE questions ADD CONSTRAINT questions_correct_answer_check 
CHECK (correct_answer IN ('a', 'b', 'c', 'd'));