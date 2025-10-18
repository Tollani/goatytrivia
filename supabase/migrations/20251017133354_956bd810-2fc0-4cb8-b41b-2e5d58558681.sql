-- Fix users table RLS policy - restrict to own wallet only
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
CREATE POLICY "Users can view their own profile" 
ON public.users 
FOR SELECT 
USING (wallet_address = current_setting('app.current_wallet'::text, true));

-- Create a view for questions that excludes correct answers for non-admins
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
WHERE is_active = true AND expiry_date >= CURRENT_DATE;

-- Grant access to the view
GRANT SELECT ON public.questions_public TO authenticated;
GRANT SELECT ON public.questions_public TO anon;

-- Create RPC function to set wallet session variable
CREATE OR REPLACE FUNCTION public.set_wallet_session(wallet_addr text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM set_config('app.current_wallet', wallet_addr, false);
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.set_wallet_session(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_wallet_session(text) TO anon;

-- Create RPC function to check if current wallet is admin
CREATE OR REPLACE FUNCTION public.is_wallet_admin(wallet_addr text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users u
    INNER JOIN public.user_roles ur ON u.id = ur.user_id
    WHERE u.wallet_address = wallet_addr
      AND ur.role = 'admin'::public.app_role
  )
$$;

GRANT EXECUTE ON FUNCTION public.is_wallet_admin(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_wallet_admin(text) TO anon;

-- Insert admin wallet addresses into user_roles table
-- First, get or create user IDs for the admin wallets
DO $$
DECLARE
  solana_wallet_id uuid;
  base_wallet_id uuid;
BEGIN
  -- Get or create Solana admin wallet
  INSERT INTO public.users (wallet_address, chain)
  VALUES ('E1NDUr8TJ2R3hgupEMKLwARx1a2TJSaNkt5j881LWDVv', 'solana')
  ON CONFLICT (wallet_address) DO NOTHING
  RETURNING id INTO solana_wallet_id;
  
  IF solana_wallet_id IS NULL THEN
    SELECT id INTO solana_wallet_id FROM public.users 
    WHERE wallet_address = 'E1NDUr8TJ2R3hgupEMKLwARx1a2TJSaNkt5j881LWDVv';
  END IF;
  
  -- Get or create Base admin wallet
  INSERT INTO public.users (wallet_address, chain)
  VALUES ('0x146d92e9f13cbd4c1166a2e7094de36596d4a3ba', 'base')
  ON CONFLICT (wallet_address) DO NOTHING
  RETURNING id INTO base_wallet_id;
  
  IF base_wallet_id IS NULL THEN
    SELECT id INTO base_wallet_id FROM public.users 
    WHERE wallet_address = '0x146d92e9f13cbd4c1166a2e7094de36596d4a3ba';
  END IF;
  
  -- Add admin roles
  INSERT INTO public.user_roles (user_id, role)
  VALUES (solana_wallet_id, 'admin'::public.app_role)
  ON CONFLICT (user_id, role) DO NOTHING;
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (base_wallet_id, 'admin'::public.app_role)
  ON CONFLICT (user_id, role) DO NOTHING;
END $$;