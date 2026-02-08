-- ============================================
-- 1. RECURRING TRANSACTIONS TABLE
-- ============================================

-- Enum for frequency
CREATE TYPE public.recurring_frequency AS ENUM ('weekly', 'biweekly', 'monthly', 'quarterly', 'yearly');

-- Recurring transactions table
CREATE TABLE public.recurring_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID REFERENCES public.households(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  envelope_id UUID REFERENCES public.envelopes(id) ON DELETE CASCADE NOT NULL,
  amount NUMERIC NOT NULL,
  description TEXT NOT NULL,
  merchant TEXT,
  frequency recurring_frequency NOT NULL DEFAULT 'monthly',
  next_due_date DATE NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.recurring_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Household members can view recurring transactions"
ON public.recurring_transactions FOR SELECT
USING (is_household_member(auth.uid(), household_id) OR (household_id IS NULL AND auth.uid() = user_id));

CREATE POLICY "Household members can create recurring transactions"
ON public.recurring_transactions FOR INSERT
WITH CHECK (is_household_member(auth.uid(), household_id) OR (household_id IS NULL AND auth.uid() = user_id));

CREATE POLICY "Household members can update recurring transactions"
ON public.recurring_transactions FOR UPDATE
USING (is_household_member(auth.uid(), household_id) OR (household_id IS NULL AND auth.uid() = user_id));

CREATE POLICY "Household members can delete recurring transactions"
ON public.recurring_transactions FOR DELETE
USING (is_household_member(auth.uid(), household_id) OR (household_id IS NULL AND auth.uid() = user_id));

-- Trigger for updated_at
CREATE TRIGGER update_recurring_transactions_updated_at
BEFORE UPDATE ON public.recurring_transactions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- 2. ACTIVITY LOG TABLE
-- ============================================

-- Enum for action types
CREATE TYPE public.activity_action AS ENUM (
  'income_added',
  'income_updated',
  'income_deleted',
  'expense_added',
  'expense_updated', 
  'expense_deleted',
  'envelope_created',
  'envelope_updated',
  'envelope_deleted',
  'allocation_made',
  'transfer_made',
  'recurring_created',
  'recurring_updated',
  'recurring_deleted',
  'member_joined',
  'member_left'
);

-- Activity log table
CREATE TABLE public.activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID REFERENCES public.households(id) ON DELETE CASCADE NOT NULL,
  user_id UUID NOT NULL,
  action activity_action NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

-- RLS Policy - only household members can view
CREATE POLICY "Household members can view activity log"
ON public.activity_log FOR SELECT
USING (is_household_member(auth.uid(), household_id));

-- Household members can insert activity
CREATE POLICY "Household members can insert activity"
ON public.activity_log FOR INSERT
WITH CHECK (is_household_member(auth.uid(), household_id));

-- Create index for faster queries
CREATE INDEX idx_activity_log_household_created ON public.activity_log(household_id, created_at DESC);
CREATE INDEX idx_recurring_next_due ON public.recurring_transactions(next_due_date, is_active);