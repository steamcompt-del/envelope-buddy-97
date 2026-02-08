-- Add position column to envelopes for custom ordering
ALTER TABLE public.envelopes 
ADD COLUMN position INTEGER NOT NULL DEFAULT 0;

-- Set initial positions based on creation order
WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at) - 1 as new_position
  FROM public.envelopes
)
UPDATE public.envelopes e
SET position = n.new_position
FROM numbered n
WHERE e.id = n.id;