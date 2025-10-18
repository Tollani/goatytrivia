-- Atomic simulated purchase to avoid connection pool/session issues
CREATE OR REPLACE FUNCTION public.simulate_credit_purchase(
  _wallet_address text,
  _chain public.blockchain_chain,
  _tx_hash text,
  _quantity integer,
  _amount numeric
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Set session variable used by RLS
  PERFORM set_config('app.current_wallet', _wallet_address, true);

  -- Record the purchase as confirmed (simulation)
  INSERT INTO public.purchases (
    wallet_address, chain, tx_hash, quantity, amount, status, session_id, tokens_credited, verified_at
  ) VALUES (
    _wallet_address, _chain, _tx_hash, _quantity, _amount, 'confirmed', 'SIMULATED', _quantity, now()
  );

  -- Credit the user
  UPDATE public.users
  SET 
    credits = credits + _quantity,
    contract_credits = COALESCE(contract_credits, 0) + _quantity,
    updated_at = now()
  WHERE wallet_address = _wallet_address;
END;
$$;

-- Safe profile fetch within same request
CREATE OR REPLACE FUNCTION public.get_wallet_profile(
  _wallet_address text
)
RETURNS TABLE (
  balance numeric,
  credits integer,
  points integer,
  streak integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM set_config('app.current_wallet', _wallet_address, true);

  RETURN QUERY
  SELECT u.balance, u.credits, u.points, u.streak
  FROM public.users u
  WHERE u.wallet_address = _wallet_address
  LIMIT 1;
END;
$$;
