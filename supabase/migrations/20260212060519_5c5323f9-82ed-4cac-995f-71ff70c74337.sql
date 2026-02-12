-- Allow household members to update activity log entries (for undo marking)
CREATE POLICY "Household members can update activity log"
ON public.activity_log
FOR UPDATE
USING (is_household_member(auth.uid(), household_id))
WITH CHECK (is_household_member(auth.uid(), household_id));