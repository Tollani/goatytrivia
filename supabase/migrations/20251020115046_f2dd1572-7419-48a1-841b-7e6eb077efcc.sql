-- Add lowercase enum values to question_category
DO $$ 
BEGIN
  -- Add 'ct' if not exists
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'ct' AND enumtypid = 'question_category'::regtype) THEN
    ALTER TYPE question_category ADD VALUE 'ct';
  END IF;
  
  -- Add 'web3' if not exists
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'web3' AND enumtypid = 'question_category'::regtype) THEN
    ALTER TYPE question_category ADD VALUE 'web3';
  END IF;
  
  -- Add 'news' if not exists
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'news' AND enumtypid = 'question_category'::regtype) THEN
    ALTER TYPE question_category ADD VALUE 'news';
  END IF;
END $$;