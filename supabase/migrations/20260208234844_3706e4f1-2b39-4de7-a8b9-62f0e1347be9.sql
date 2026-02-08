-- Drop the old unique constraint that only considers user_id and month_key
ALTER TABLE public.monthly_budgets DROP CONSTRAINT IF EXISTS monthly_budgets_user_id_month_key_key;

-- Create a new unique constraint that includes household_id
-- This allows the same user to have budgets for the same month in different households
ALTER TABLE public.monthly_budgets ADD CONSTRAINT monthly_budgets_user_household_month_key UNIQUE (user_id, household_id, month_key);