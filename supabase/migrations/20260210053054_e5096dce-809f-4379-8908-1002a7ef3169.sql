
-- Add is_split column to transactions
ALTER TABLE public.transactions ADD COLUMN is_split boolean NOT NULL DEFAULT false;

-- Create transaction_splits table
CREATE TABLE public.transaction_splits (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  parent_transaction_id uuid NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
  envelope_id uuid NOT NULL REFERENCES public.envelopes(id) ON DELETE CASCADE,
  amount numeric NOT NULL,
  percentage integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  user_id uuid NOT NULL,
  household_id uuid REFERENCES public.households(id)
);

-- Enable RLS
ALTER TABLE public.transaction_splits ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Household members can view splits"
ON public.transaction_splits
FOR SELECT
USING (is_household_member(auth.uid(), household_id) OR (household_id IS NULL AND auth.uid() = user_id));

CREATE POLICY "Household members can create splits"
ON public.transaction_splits
FOR INSERT
WITH CHECK (is_household_member(auth.uid(), household_id) OR (household_id IS NULL AND auth.uid() = user_id));

CREATE POLICY "Household members can update splits"
ON public.transaction_splits
FOR UPDATE
USING (is_household_member(auth.uid(), household_id) OR (household_id IS NULL AND auth.uid() = user_id));

CREATE POLICY "Household members can delete splits"
ON public.transaction_splits
FOR DELETE
USING (is_household_member(auth.uid(), household_id) OR (household_id IS NULL AND auth.uid() = user_id));

-- Index for fast lookup
CREATE INDEX idx_transaction_splits_parent ON public.transaction_splits(parent_transaction_id);
CREATE INDEX idx_transaction_splits_envelope ON public.transaction_splits(envelope_id);
