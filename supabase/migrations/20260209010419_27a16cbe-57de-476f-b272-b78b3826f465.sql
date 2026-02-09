-- Create savings_goals table for envelope-based savings tracking
CREATE TABLE public.savings_goals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  household_id UUID REFERENCES public.households(id) ON DELETE CASCADE,
  envelope_id UUID NOT NULL REFERENCES public.envelopes(id) ON DELETE CASCADE,
  target_amount NUMERIC NOT NULL DEFAULT 0,
  target_date DATE,
  current_amount NUMERIC NOT NULL DEFAULT 0,
  name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(envelope_id)
);

-- Enable Row Level Security
ALTER TABLE public.savings_goals ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view savings goals in their household"
ON public.savings_goals
FOR SELECT
USING (
  household_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.household_members hm
    WHERE hm.household_id = savings_goals.household_id
    AND hm.user_id = auth.uid()
  )
  OR (household_id IS NULL AND user_id = auth.uid())
);

CREATE POLICY "Users can create savings goals"
ON public.savings_goals
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update savings goals in their household"
ON public.savings_goals
FOR UPDATE
USING (
  household_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.household_members hm
    WHERE hm.household_id = savings_goals.household_id
    AND hm.user_id = auth.uid()
  )
  OR (household_id IS NULL AND user_id = auth.uid())
);

CREATE POLICY "Users can delete savings goals in their household"
ON public.savings_goals
FOR DELETE
USING (
  household_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.household_members hm
    WHERE hm.household_id = savings_goals.household_id
    AND hm.user_id = auth.uid()
  )
  OR (household_id IS NULL AND user_id = auth.uid())
);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_savings_goals_updated_at
BEFORE UPDATE ON public.savings_goals
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();