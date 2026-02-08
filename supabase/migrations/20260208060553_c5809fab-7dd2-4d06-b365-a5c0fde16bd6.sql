-- Create shopping list archives table
CREATE TABLE public.shopping_list_archives (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  household_id UUID REFERENCES public.households(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Liste de courses',
  items JSONB NOT NULL DEFAULT '[]',
  total_estimated NUMERIC DEFAULT 0,
  items_count INTEGER NOT NULL DEFAULT 0,
  archived_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.shopping_list_archives ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Household members can view archives"
ON public.shopping_list_archives FOR SELECT
USING (is_household_member(auth.uid(), household_id) OR (household_id IS NULL AND auth.uid() = user_id));

CREATE POLICY "Household members can create archives"
ON public.shopping_list_archives FOR INSERT
WITH CHECK (is_household_member(auth.uid(), household_id) OR (household_id IS NULL AND auth.uid() = user_id));

CREATE POLICY "Household members can delete archives"
ON public.shopping_list_archives FOR DELETE
USING (is_household_member(auth.uid(), household_id) OR (household_id IS NULL AND auth.uid() = user_id));