-- Add contract-related fields to database
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS contract_credits bigint DEFAULT 0;

-- Create contracts configuration table
CREATE TABLE IF NOT EXISTS public.contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chain text NOT NULL CHECK (chain IN ('solana', 'base')),
  contract_address text NOT NULL,
  usdc_address text NOT NULL,
  abi jsonb,
  program_id text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(chain)
);

-- Enable RLS
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;

-- Allow public read access to contract info
CREATE POLICY "Anyone can view active contracts"
ON public.contracts
FOR SELECT
USING (is_active = true);

-- Only admins can modify contracts
CREATE POLICY "Admins can manage contracts"
ON public.contracts
FOR ALL
USING (is_admin());

-- Add trigger for updated_at
CREATE TRIGGER update_contracts_updated_at
BEFORE UPDATE ON public.contracts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();