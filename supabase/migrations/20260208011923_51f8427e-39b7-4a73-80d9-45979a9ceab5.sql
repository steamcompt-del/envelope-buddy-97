-- Add INSERT policy for households table
CREATE POLICY "Users can create a household"
ON public.households FOR INSERT
WITH CHECK (auth.uid() = created_by);

-- The existing SELECT policy "Anyone can view household by invite code for joining" is too permissive
-- Let's drop it and create more specific policies
DROP POLICY IF EXISTS "Anyone can view household by invite code for joining" ON public.households;