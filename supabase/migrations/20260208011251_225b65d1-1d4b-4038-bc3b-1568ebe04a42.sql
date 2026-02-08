-- Create households table (ménages)
CREATE TABLE public.households (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL DEFAULT 'Mon Ménage',
  invite_code TEXT UNIQUE NOT NULL DEFAULT upper(substring(md5(random()::text) from 1 for 8)),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Create household members table
CREATE TABLE public.household_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(household_id, user_id)
);

-- Enable RLS
ALTER TABLE public.households ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.household_members ENABLE ROW LEVEL SECURITY;

-- Function to get user's household_id (security definer to avoid recursion)
CREATE OR REPLACE FUNCTION public.get_user_household_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT household_id FROM public.household_members WHERE user_id = _user_id LIMIT 1
$$;

-- Function to check if user is in same household
CREATE OR REPLACE FUNCTION public.is_household_member(_user_id UUID, _household_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.household_members 
    WHERE user_id = _user_id AND household_id = _household_id
  )
$$;

-- RLS policies for households
CREATE POLICY "Users can view their household"
ON public.households FOR SELECT
USING (public.is_household_member(auth.uid(), id));

CREATE POLICY "Users can update their household"
ON public.households FOR UPDATE
USING (public.is_household_member(auth.uid(), id));

CREATE POLICY "Anyone can view household by invite code for joining"
ON public.households FOR SELECT
USING (true);

-- RLS policies for household_members
CREATE POLICY "Users can view members of their household"
ON public.household_members FOR SELECT
USING (public.is_household_member(auth.uid(), household_id));

CREATE POLICY "Users can join a household"
ON public.household_members FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can leave their household"
ON public.household_members FOR DELETE
USING (auth.uid() = user_id);

-- Add household_id to existing tables
ALTER TABLE public.envelopes ADD COLUMN household_id UUID REFERENCES public.households(id) ON DELETE CASCADE;
ALTER TABLE public.envelope_allocations ADD COLUMN household_id UUID REFERENCES public.households(id) ON DELETE CASCADE;
ALTER TABLE public.incomes ADD COLUMN household_id UUID REFERENCES public.households(id) ON DELETE CASCADE;
ALTER TABLE public.monthly_budgets ADD COLUMN household_id UUID REFERENCES public.households(id) ON DELETE CASCADE;
ALTER TABLE public.transactions ADD COLUMN household_id UUID REFERENCES public.households(id) ON DELETE CASCADE;
ALTER TABLE public.receipts ADD COLUMN household_id UUID REFERENCES public.households(id) ON DELETE CASCADE;

-- Update RLS policies to use household_id instead of user_id

-- Envelopes
DROP POLICY IF EXISTS "Users can view their own envelopes" ON public.envelopes;
DROP POLICY IF EXISTS "Users can create their own envelopes" ON public.envelopes;
DROP POLICY IF EXISTS "Users can update their own envelopes" ON public.envelopes;
DROP POLICY IF EXISTS "Users can delete their own envelopes" ON public.envelopes;

CREATE POLICY "Household members can view envelopes"
ON public.envelopes FOR SELECT
USING (public.is_household_member(auth.uid(), household_id) OR household_id IS NULL AND auth.uid() = user_id);

CREATE POLICY "Household members can create envelopes"
ON public.envelopes FOR INSERT
WITH CHECK (public.is_household_member(auth.uid(), household_id) OR household_id IS NULL AND auth.uid() = user_id);

CREATE POLICY "Household members can update envelopes"
ON public.envelopes FOR UPDATE
USING (public.is_household_member(auth.uid(), household_id) OR household_id IS NULL AND auth.uid() = user_id);

CREATE POLICY "Household members can delete envelopes"
ON public.envelopes FOR DELETE
USING (public.is_household_member(auth.uid(), household_id) OR household_id IS NULL AND auth.uid() = user_id);

-- Envelope allocations
DROP POLICY IF EXISTS "Users can view their own allocations" ON public.envelope_allocations;
DROP POLICY IF EXISTS "Users can create their own allocations" ON public.envelope_allocations;
DROP POLICY IF EXISTS "Users can update their own allocations" ON public.envelope_allocations;
DROP POLICY IF EXISTS "Users can delete their own allocations" ON public.envelope_allocations;

CREATE POLICY "Household members can view allocations"
ON public.envelope_allocations FOR SELECT
USING (public.is_household_member(auth.uid(), household_id) OR household_id IS NULL AND auth.uid() = user_id);

CREATE POLICY "Household members can create allocations"
ON public.envelope_allocations FOR INSERT
WITH CHECK (public.is_household_member(auth.uid(), household_id) OR household_id IS NULL AND auth.uid() = user_id);

CREATE POLICY "Household members can update allocations"
ON public.envelope_allocations FOR UPDATE
USING (public.is_household_member(auth.uid(), household_id) OR household_id IS NULL AND auth.uid() = user_id);

CREATE POLICY "Household members can delete allocations"
ON public.envelope_allocations FOR DELETE
USING (public.is_household_member(auth.uid(), household_id) OR household_id IS NULL AND auth.uid() = user_id);

-- Incomes
DROP POLICY IF EXISTS "Users can view their own incomes" ON public.incomes;
DROP POLICY IF EXISTS "Users can create their own incomes" ON public.incomes;
DROP POLICY IF EXISTS "Users can update their own incomes" ON public.incomes;
DROP POLICY IF EXISTS "Users can delete their own incomes" ON public.incomes;

CREATE POLICY "Household members can view incomes"
ON public.incomes FOR SELECT
USING (public.is_household_member(auth.uid(), household_id) OR household_id IS NULL AND auth.uid() = user_id);

CREATE POLICY "Household members can create incomes"
ON public.incomes FOR INSERT
WITH CHECK (public.is_household_member(auth.uid(), household_id) OR household_id IS NULL AND auth.uid() = user_id);

CREATE POLICY "Household members can update incomes"
ON public.incomes FOR UPDATE
USING (public.is_household_member(auth.uid(), household_id) OR household_id IS NULL AND auth.uid() = user_id);

CREATE POLICY "Household members can delete incomes"
ON public.incomes FOR DELETE
USING (public.is_household_member(auth.uid(), household_id) OR household_id IS NULL AND auth.uid() = user_id);

-- Monthly budgets
DROP POLICY IF EXISTS "Users can view their own monthly budgets" ON public.monthly_budgets;
DROP POLICY IF EXISTS "Users can create their own monthly budgets" ON public.monthly_budgets;
DROP POLICY IF EXISTS "Users can update their own monthly budgets" ON public.monthly_budgets;
DROP POLICY IF EXISTS "Users can delete their own monthly budgets" ON public.monthly_budgets;

CREATE POLICY "Household members can view monthly budgets"
ON public.monthly_budgets FOR SELECT
USING (public.is_household_member(auth.uid(), household_id) OR household_id IS NULL AND auth.uid() = user_id);

CREATE POLICY "Household members can create monthly budgets"
ON public.monthly_budgets FOR INSERT
WITH CHECK (public.is_household_member(auth.uid(), household_id) OR household_id IS NULL AND auth.uid() = user_id);

CREATE POLICY "Household members can update monthly budgets"
ON public.monthly_budgets FOR UPDATE
USING (public.is_household_member(auth.uid(), household_id) OR household_id IS NULL AND auth.uid() = user_id);

CREATE POLICY "Household members can delete monthly budgets"
ON public.monthly_budgets FOR DELETE
USING (public.is_household_member(auth.uid(), household_id) OR household_id IS NULL AND auth.uid() = user_id);

-- Transactions
DROP POLICY IF EXISTS "Users can view their own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Users can create their own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Users can update their own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Users can delete their own transactions" ON public.transactions;

CREATE POLICY "Household members can view transactions"
ON public.transactions FOR SELECT
USING (public.is_household_member(auth.uid(), household_id) OR household_id IS NULL AND auth.uid() = user_id);

CREATE POLICY "Household members can create transactions"
ON public.transactions FOR INSERT
WITH CHECK (public.is_household_member(auth.uid(), household_id) OR household_id IS NULL AND auth.uid() = user_id);

CREATE POLICY "Household members can update transactions"
ON public.transactions FOR UPDATE
USING (public.is_household_member(auth.uid(), household_id) OR household_id IS NULL AND auth.uid() = user_id);

CREATE POLICY "Household members can delete transactions"
ON public.transactions FOR DELETE
USING (public.is_household_member(auth.uid(), household_id) OR household_id IS NULL AND auth.uid() = user_id);

-- Receipts
DROP POLICY IF EXISTS "Users can view their own receipts" ON public.receipts;
DROP POLICY IF EXISTS "Users can create their own receipts" ON public.receipts;
DROP POLICY IF EXISTS "Users can update their own receipts" ON public.receipts;
DROP POLICY IF EXISTS "Users can delete their own receipts" ON public.receipts;

CREATE POLICY "Household members can view receipts"
ON public.receipts FOR SELECT
USING (public.is_household_member(auth.uid(), household_id) OR household_id IS NULL AND auth.uid() = user_id);

CREATE POLICY "Household members can create receipts"
ON public.receipts FOR INSERT
WITH CHECK (public.is_household_member(auth.uid(), household_id) OR household_id IS NULL AND auth.uid() = user_id);

CREATE POLICY "Household members can update receipts"
ON public.receipts FOR UPDATE
USING (public.is_household_member(auth.uid(), household_id) OR household_id IS NULL AND auth.uid() = user_id);

CREATE POLICY "Household members can delete receipts"
ON public.receipts FOR DELETE
USING (public.is_household_member(auth.uid(), household_id) OR household_id IS NULL AND auth.uid() = user_id);