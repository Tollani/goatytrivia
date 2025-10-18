-- Update users table: add credits, points, streak, last_win
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS credits INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS points INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS streak INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_win TIMESTAMP WITH TIME ZONE;

-- Update purchases table for on-chain verification
ALTER TABLE public.purchases
ADD COLUMN IF NOT EXISTS quantity INTEGER NOT NULL DEFAULT 1,
ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP WITH TIME ZONE;

-- Update claims table
ALTER TABLE public.claims
ADD COLUMN IF NOT EXISTS points_redeemed INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS streak_redeemed BOOLEAN NOT NULL DEFAULT false;

-- Create index for faster wallet lookups
CREATE INDEX IF NOT EXISTS idx_users_wallet ON public.users(wallet_address);
CREATE INDEX IF NOT EXISTS idx_purchases_tx_hash ON public.purchases(tx_hash);
CREATE INDEX IF NOT EXISTS idx_claims_wallet ON public.claims(wallet_address);

-- Update RLS policies for new credit system
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
CREATE POLICY "Users can update their own profile" 
ON public.users 
FOR UPDATE 
USING (wallet_address = current_setting('app.current_wallet'::text, true))
WITH CHECK (wallet_address = current_setting('app.current_wallet'::text, true));

-- Allow admins to view all users
CREATE POLICY "Admins can view all users" 
ON public.users 
FOR SELECT 
USING (is_admin() OR wallet_address = current_setting('app.current_wallet'::text, true));