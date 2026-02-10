
-- Create priority enum
CREATE TYPE public.savings_priority AS ENUM ('essential', 'high', 'medium', 'low');

-- Add new columns to savings_goals
ALTER TABLE public.savings_goals
  ADD COLUMN priority public.savings_priority NOT NULL DEFAULT 'medium',
  ADD COLUMN auto_contribute boolean NOT NULL DEFAULT false,
  ADD COLUMN monthly_contribution numeric DEFAULT NULL,
  ADD COLUMN contribution_percentage integer DEFAULT NULL,
  ADD COLUMN is_paused boolean NOT NULL DEFAULT false,
  ADD COLUMN celebration_threshold integer[] DEFAULT ARRAY[100];

-- Add validation trigger for contribution_percentage
CREATE OR REPLACE FUNCTION public.validate_savings_goal_contribution()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.contribution_percentage IS NOT NULL AND (NEW.contribution_percentage < 1 OR NEW.contribution_percentage > 50) THEN
    RAISE EXCEPTION 'contribution_percentage must be between 1 and 50';
  END IF;
  IF NEW.monthly_contribution IS NOT NULL AND NEW.monthly_contribution < 0 THEN
    RAISE EXCEPTION 'monthly_contribution must be non-negative';
  END IF;
  RETURN NEW;
END;
$function$;

CREATE TRIGGER validate_savings_goal_contribution_trigger
BEFORE INSERT OR UPDATE ON public.savings_goals
FOR EACH ROW
EXECUTE FUNCTION public.validate_savings_goal_contribution();
