-- Add rollover flag to envelopes table
ALTER TABLE public.envelopes 
ADD COLUMN rollover boolean NOT NULL DEFAULT false;

-- Comment explaining the column
COMMENT ON COLUMN public.envelopes.rollover IS 'If true, unspent budget rolls over to next month when starting a new month';