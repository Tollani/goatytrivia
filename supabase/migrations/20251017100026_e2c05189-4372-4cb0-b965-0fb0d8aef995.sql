-- Fix function search path security issue
-- Recreate is_admin function with proper search_path handling

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE role = 'admin'::public.app_role
    LIMIT 1
  );
END;
$$;

-- Explicitly set search_path for the function
ALTER FUNCTION public.is_admin() SET search_path TO 'public';

-- Also verify has_role function has proper search_path
ALTER FUNCTION public.has_role(uuid, app_role) SET search_path TO 'public';