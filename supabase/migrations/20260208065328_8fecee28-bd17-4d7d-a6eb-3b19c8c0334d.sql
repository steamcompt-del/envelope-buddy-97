-- Allow household members to view profiles of other members in the same household
CREATE POLICY "Household members can view member profiles"
ON public.profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.household_members hm1
    JOIN public.household_members hm2 ON hm1.household_id = hm2.household_id
    WHERE hm1.user_id = auth.uid()
    AND hm2.user_id = profiles.user_id
  )
);