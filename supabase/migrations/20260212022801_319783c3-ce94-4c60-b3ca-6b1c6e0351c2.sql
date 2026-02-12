
CREATE TABLE public.auto_allocation_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  household_id UUID REFERENCES public.households(id),
  month_key TEXT NOT NULL,
  goal_name TEXT NOT NULL,
  envelope_id UUID REFERENCES public.envelopes(id) ON DELETE SET NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  priority TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'success',
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.auto_allocation_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their auto-allocation history"
ON public.auto_allocation_history FOR SELECT
USING (is_household_member(auth.uid(), household_id) OR (household_id IS NULL AND auth.uid() = user_id));

CREATE POLICY "Service can insert auto-allocation history"
ON public.auto_allocation_history FOR INSERT
WITH CHECK (true);

CREATE POLICY "Users can delete their auto-allocation history"
ON public.auto_allocation_history FOR DELETE
USING (is_household_member(auth.uid(), household_id) OR (household_id IS NULL AND auth.uid() = user_id));

CREATE INDEX idx_auto_allocation_history_user ON public.auto_allocation_history(user_id, month_key);
CREATE INDEX idx_auto_allocation_history_household ON public.auto_allocation_history(household_id, month_key);
