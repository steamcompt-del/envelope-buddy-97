-- Atomic function to adjust to_be_budgeted safely (prevents race conditions)
CREATE OR REPLACE FUNCTION public.adjust_to_be_budgeted(
  p_month_key text,
  p_household_id uuid,
  p_user_id uuid,
  p_amount numeric
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF p_household_id IS NOT NULL THEN
    UPDATE monthly_budgets
    SET to_be_budgeted = to_be_budgeted + p_amount
    WHERE month_key = p_month_key
      AND household_id = p_household_id;
  ELSE
    UPDATE monthly_budgets
    SET to_be_budgeted = to_be_budgeted + p_amount
    WHERE month_key = p_month_key
      AND user_id = p_user_id
      AND household_id IS NULL;
  END IF;
END;
$$;

-- Atomic function to adjust envelope allocation safely (prevents race conditions)
CREATE OR REPLACE FUNCTION public.adjust_allocation_atomic(
  p_envelope_id uuid,
  p_month_key text,
  p_amount numeric
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE envelope_allocations
  SET allocated = allocated + p_amount
  WHERE envelope_id = p_envelope_id
    AND month_key = p_month_key;
END;
$$;