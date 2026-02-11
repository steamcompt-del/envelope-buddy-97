
CREATE OR REPLACE FUNCTION public.increment_spent_atomic(
  p_envelope_id UUID,
  p_month_key TEXT,
  p_amount NUMERIC
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE envelope_allocations
  SET spent = spent + p_amount
  WHERE envelope_id = p_envelope_id
    AND month_key = p_month_key;
  
  IF NOT FOUND THEN
    INSERT INTO envelope_allocations (
      user_id, 
      household_id, 
      envelope_id, 
      month_key, 
      allocated, 
      spent
    )
    SELECT 
      user_id,
      household_id,
      p_envelope_id,
      p_month_key,
      0,
      p_amount
    FROM envelopes
    WHERE id = p_envelope_id
    LIMIT 1;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.decrement_spent_atomic(
  p_envelope_id UUID,
  p_month_key TEXT,
  p_amount NUMERIC
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE envelope_allocations
  SET spent = GREATEST(0, spent - p_amount)
  WHERE envelope_id = p_envelope_id
    AND month_key = p_month_key;
END;
$$;
