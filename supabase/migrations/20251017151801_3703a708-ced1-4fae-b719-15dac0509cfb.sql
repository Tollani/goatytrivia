-- Ensure admin wallets have test credits for QA
create or replace function public.admin_ensure_test_credits(
  _wallet_address text,
  _chain blockchain_chain,
  _threshold integer default 10,
  _target integer default 100
)
returns void
language plpgsql
security definer
set search_path = 'public'
as $$
declare
  v_is_admin boolean;
  v_user_id uuid;
  v_current integer;
begin
  -- Set session variable used by RLS
  perform set_config('app.current_wallet', _wallet_address, true);

  -- Ensure user exists
  select id, credits into v_user_id, v_current
  from public.users
  where wallet_address = _wallet_address
  limit 1;

  if v_user_id is null then
    insert into public.users (wallet_address, chain)
    values (_wallet_address, _chain);

    select id, credits into v_user_id, v_current
    from public.users
    where wallet_address = _wallet_address
    limit 1;
  end if;

  -- Check admin status based on wallet
  v_is_admin := public.is_wallet_admin(_wallet_address);

  if v_is_admin then
    -- Top up only if below threshold
    if coalesce(v_current, 0) < _threshold then
      update public.users
      set credits = _target,
          updated_at = now()
      where id = v_user_id;
    end if;
  end if;
end;
$$;