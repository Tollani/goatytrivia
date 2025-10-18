-- Fix security definer view issue
DROP VIEW IF EXISTS public.questions_public;

-- Recreate view without security definer
CREATE OR REPLACE VIEW public.questions_public AS
SELECT 
  id,
  text,
  category,
  options,
  expiry_date,
  is_active,
  created_at,
  source_url
FROM public.questions
WHERE is_active = true 
  AND expiry_date >= CURRENT_DATE;