-- Allow household creators to delete their household
CREATE POLICY "Creators can delete their household" 
ON public.households 
FOR DELETE 
USING (auth.uid() = created_by);