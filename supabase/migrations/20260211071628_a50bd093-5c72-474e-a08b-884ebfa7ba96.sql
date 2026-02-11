-- Step 1: Drop the current_amount column (never used correctly, UI uses envelope.allocated)
ALTER TABLE public.savings_goals DROP COLUMN IF EXISTS current_amount;