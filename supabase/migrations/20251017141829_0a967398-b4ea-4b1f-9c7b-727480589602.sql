-- Fix security definer view by enabling security invoker
DROP VIEW IF EXISTS public.questions_public;

CREATE OR REPLACE VIEW public.questions_public 
WITH (security_invoker=on) AS
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