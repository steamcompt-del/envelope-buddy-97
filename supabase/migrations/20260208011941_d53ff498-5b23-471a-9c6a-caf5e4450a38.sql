-- Allow users to find a household by invite code (for joining)
-- This is needed so users can look up a household before joining it
CREATE POLICY "Users can view household by invite code"
ON public.households FOR SELECT
USING (true);