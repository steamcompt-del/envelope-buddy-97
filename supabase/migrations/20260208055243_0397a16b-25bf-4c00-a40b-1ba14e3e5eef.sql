-- Create shopping list table
CREATE TABLE public.shopping_list (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  household_id UUID REFERENCES public.households(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  quantity NUMERIC DEFAULT 1,
  estimated_price NUMERIC,
  envelope_id UUID REFERENCES public.envelopes(id) ON DELETE SET NULL,
  is_checked BOOLEAN NOT NULL DEFAULT false,
  suggested_from_history BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.shopping_list ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Household members can view shopping list"
ON public.shopping_list FOR SELECT
USING (is_household_member(auth.uid(), household_id) OR (household_id IS NULL AND auth.uid() = user_id));

CREATE POLICY "Household members can create shopping items"
ON public.shopping_list FOR INSERT
WITH CHECK (is_household_member(auth.uid(), household_id) OR (household_id IS NULL AND auth.uid() = user_id));

CREATE POLICY "Household members can update shopping items"
ON public.shopping_list FOR UPDATE
USING (is_household_member(auth.uid(), household_id) OR (household_id IS NULL AND auth.uid() = user_id));

CREATE POLICY "Household members can delete shopping items"
ON public.shopping_list FOR DELETE
USING (is_household_member(auth.uid(), household_id) OR (household_id IS NULL AND auth.uid() = user_id));

-- Trigger for updated_at
CREATE TRIGGER update_shopping_list_updated_at
BEFORE UPDATE ON public.shopping_list
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();