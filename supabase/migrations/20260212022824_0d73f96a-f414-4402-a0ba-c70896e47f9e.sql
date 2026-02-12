
DROP POLICY "Service can insert auto-allocation history" ON public.auto_allocation_history;

CREATE POLICY "Users can insert auto-allocation history"
ON public.auto_allocation_history FOR INSERT
WITH CHECK (auth.uid() = user_id OR is_household_member(auth.uid(), household_id));
