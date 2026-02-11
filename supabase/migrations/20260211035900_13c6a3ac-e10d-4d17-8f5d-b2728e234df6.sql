
-- Create rollover history table for tracking all rollovers
CREATE TABLE public.rollover_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  household_id UUID REFERENCES public.households(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  envelope_id UUID REFERENCES public.envelopes(id) ON DELETE CASCADE NOT NULL,
  envelope_name TEXT NOT NULL,
  source_month_key TEXT NOT NULL,
  target_month_key TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  strategy TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX idx_rollover_history_envelope ON public.rollover_history(envelope_id, target_month_key);

-- Enable RLS
ALTER TABLE public.rollover_history ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view rollover history"
ON public.rollover_history
FOR SELECT
USING (
  is_household_member(auth.uid(), household_id) 
  OR (household_id IS NULL AND auth.uid() = user_id)
);

CREATE POLICY "Users can insert rollover history"
ON public.rollover_history
FOR INSERT
WITH CHECK (
  is_household_member(auth.uid(), household_id) 
  OR (household_id IS NULL AND auth.uid() = user_id)
);

CREATE POLICY "Users can delete rollover history"
ON public.rollover_history
FOR DELETE
USING (
  is_household_member(auth.uid(), household_id) 
  OR (household_id IS NULL AND auth.uid() = user_id)
);
