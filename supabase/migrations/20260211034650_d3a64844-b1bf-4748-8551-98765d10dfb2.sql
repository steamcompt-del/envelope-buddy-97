
-- Add recurring_transaction_id to transactions to link auto-applied transactions back to their recurring source
ALTER TABLE public.transactions 
ADD COLUMN recurring_transaction_id UUID REFERENCES public.recurring_transactions(id) ON DELETE SET NULL;

-- Index for efficient lookups
CREATE INDEX idx_transactions_recurring ON public.transactions(recurring_transaction_id) WHERE recurring_transaction_id IS NOT NULL;
