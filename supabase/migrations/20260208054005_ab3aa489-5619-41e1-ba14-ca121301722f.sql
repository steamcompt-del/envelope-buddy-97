-- Create a table to store receipt line items
CREATE TABLE public.receipt_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  receipt_id UUID NOT NULL REFERENCES public.receipts(id) ON DELETE CASCADE,
  household_id UUID REFERENCES public.households(id),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  quantity NUMERIC DEFAULT 1,
  unit_price NUMERIC,
  total_price NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.receipt_items ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Household members can view receipt items"
  ON public.receipt_items
  FOR SELECT
  USING (
    is_household_member(auth.uid(), household_id) 
    OR (household_id IS NULL AND auth.uid() = user_id)
  );

CREATE POLICY "Household members can create receipt items"
  ON public.receipt_items
  FOR INSERT
  WITH CHECK (
    is_household_member(auth.uid(), household_id) 
    OR (household_id IS NULL AND auth.uid() = user_id)
  );

CREATE POLICY "Household members can update receipt items"
  ON public.receipt_items
  FOR UPDATE
  USING (
    is_household_member(auth.uid(), household_id) 
    OR (household_id IS NULL AND auth.uid() = user_id)
  );

CREATE POLICY "Household members can delete receipt items"
  ON public.receipt_items
  FOR DELETE
  USING (
    is_household_member(auth.uid(), household_id) 
    OR (household_id IS NULL AND auth.uid() = user_id)
  );

-- Index for faster queries
CREATE INDEX idx_receipt_items_receipt_id ON public.receipt_items(receipt_id);