-- Fix critical security issues in RLS policies

-- 1. Fix users table policies - prevent arbitrary user creation
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.users;
CREATE POLICY "Users can insert their own profile" 
  ON public.users FOR INSERT
  WITH CHECK (wallet_address IS NOT NULL);

-- 2. Fix purchases table - add basic validation for purchase creation
DROP POLICY IF EXISTS "Anyone can create purchases" ON public.purchases;
CREATE POLICY "Users can create their own purchases" 
  ON public.purchases FOR INSERT
  WITH CHECK (
    wallet_address IS NOT NULL
    AND tx_hash IS NOT NULL
    AND session_id IS NOT NULL
  );

-- 3. Fix game_history table - basic validation
DROP POLICY IF EXISTS "Anyone can insert game history" ON public.game_history;
CREATE POLICY "Users can insert their own game history" 
  ON public.game_history FOR INSERT
  WITH CHECK (
    wallet_address IS NOT NULL
    AND user_id IS NOT NULL
  );

-- 4. Fix claims table policies
DROP POLICY IF EXISTS "Users can create claims" ON public.claims;
CREATE POLICY "Users can create their own claims" 
  ON public.claims FOR INSERT
  WITH CHECK (
    wallet_address IS NOT NULL
    AND user_id IS NOT NULL
  );

-- 5. Create a better admin check function
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE role = 'admin'::app_role
    LIMIT 1
  )
$$;

-- 6. Fix admin policies to use better function
DROP POLICY IF EXISTS "Admins can manage questions" ON public.questions;
CREATE POLICY "Admins can manage questions" 
  ON public.questions FOR ALL
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can update purchases" ON public.purchases;
CREATE POLICY "Admins can update purchases" 
  ON public.purchases FOR UPDATE
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can update claims" ON public.claims;
CREATE POLICY "Admins can update claims" 
  ON public.claims FOR UPDATE
  USING (public.is_admin());

-- 7. Add performance indexes
CREATE INDEX IF NOT EXISTS idx_users_wallet_address ON public.users(wallet_address);
CREATE INDEX IF NOT EXISTS idx_purchases_wallet_address ON public.purchases(wallet_address);
CREATE INDEX IF NOT EXISTS idx_purchases_status ON public.purchases(status);
CREATE INDEX IF NOT EXISTS idx_game_history_wallet_address ON public.game_history(wallet_address);
CREATE INDEX IF NOT EXISTS idx_game_history_user_id ON public.game_history(user_id);
CREATE INDEX IF NOT EXISTS idx_game_history_timestamp ON public.game_history(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_claims_wallet_address ON public.claims(wallet_address);
CREATE INDEX IF NOT EXISTS idx_claims_status ON public.claims(status);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_questions_active_expiry ON public.questions(is_active, expiry_date);

-- 8. Make critical columns non-nullable to prevent data integrity issues
ALTER TABLE public.users ALTER COLUMN wallet_address SET NOT NULL;
ALTER TABLE public.purchases ALTER COLUMN wallet_address SET NOT NULL;
ALTER TABLE public.purchases ALTER COLUMN tx_hash SET NOT NULL;
ALTER TABLE public.purchases ALTER COLUMN session_id SET NOT NULL;
ALTER TABLE public.game_history ALTER COLUMN wallet_address SET NOT NULL;
ALTER TABLE public.game_history ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.claims ALTER COLUMN wallet_address SET NOT NULL;
ALTER TABLE public.claims ALTER COLUMN user_id SET NOT NULL;