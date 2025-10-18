-- Fix simulate_credit_purchase to avoid duplicate session_id and only credit on successful insert
CREATE OR REPLACE FUNCTION public.simulate_credit_purchase(
  _wallet_address text,
  _chain blockchain_chain,
  _tx_hash text,
  _quantity integer,
  _amount numeric
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_session_id text := COALESCE(_tx_hash, gen_random_uuid()::text);
  v_rowcount integer := 0;
BEGIN
  -- Set session variable used by RLS
  PERFORM set_config('app.current_wallet', _wallet_address, true);

  -- Insert purchase with unique session id; if it already exists, do nothing
  INSERT INTO public.purchases (
    wallet_address, chain, tx_hash, quantity, amount, status, session_id, tokens_credited, verified_at
  ) VALUES (
    _wallet_address, _chain, _tx_hash, _quantity, _amount, 'confirmed', v_session_id, _quantity, now()
  )
  ON CONFLICT (session_id) DO NOTHING;

  GET DIAGNOSTICS v_rowcount = ROW_COUNT;

  -- Only credit the user if the purchase row was inserted
  IF v_rowcount > 0 THEN
    UPDATE public.users
    SET 
      credits = credits + _quantity,
      contract_credits = COALESCE(contract_credits, 0) + _quantity,
      updated_at = now()
    WHERE wallet_address = _wallet_address;
  END IF;
END;
$function$;