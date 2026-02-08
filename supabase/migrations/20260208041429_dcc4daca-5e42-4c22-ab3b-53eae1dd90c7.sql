-- Add notes column to transactions table for collaborative comments
ALTER TABLE public.transactions 
ADD COLUMN notes text;

-- Add comment to describe the column
COMMENT ON COLUMN public.transactions.notes IS 'Collaborative notes/comments on the transaction';