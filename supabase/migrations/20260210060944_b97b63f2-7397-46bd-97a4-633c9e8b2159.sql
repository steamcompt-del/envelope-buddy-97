-- Add category enum and column to envelopes
CREATE TYPE public.envelope_category AS ENUM ('essentiels', 'lifestyle', 'epargne');

ALTER TABLE public.envelopes 
ADD COLUMN category public.envelope_category NOT NULL DEFAULT 'essentiels';

-- Auto-assign 'epargne' to PiggyBank envelopes
UPDATE public.envelopes SET category = 'epargne' WHERE icon = 'PiggyBank';
