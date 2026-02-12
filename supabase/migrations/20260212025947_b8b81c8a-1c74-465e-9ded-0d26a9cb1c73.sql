
-- Scénario 7: Validation côté DB pour les montants négatifs et excessifs
CREATE OR REPLACE FUNCTION public.validate_transaction_amount()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.amount <= 0 THEN
    RAISE EXCEPTION 'Transaction amount must be positive, got %', NEW.amount;
  END IF;
  IF NEW.amount > 1000000 THEN
    RAISE EXCEPTION 'Transaction amount too large: %', NEW.amount;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE TRIGGER validate_transaction_amount_trigger
BEFORE INSERT OR UPDATE ON public.transactions
FOR EACH ROW
EXECUTE FUNCTION public.validate_transaction_amount();

-- Scénario 10: Empêcher la suppression d'enveloppes ayant des transactions dans le mois courant
CREATE OR REPLACE FUNCTION public.prevent_envelope_delete_with_transactions()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  tx_count integer;
BEGIN
  -- Vérifier s'il y a des transactions liées à cette enveloppe
  SELECT COUNT(*) INTO tx_count
  FROM public.transactions
  WHERE envelope_id = OLD.id;

  IF tx_count > 0 THEN
    RAISE EXCEPTION 'Cannot delete envelope with % existing transaction(s). Delete or reassign them first.', tx_count;
  END IF;

  -- Vérifier s'il y a des splits liés
  SELECT COUNT(*) INTO tx_count
  FROM public.transaction_splits
  WHERE envelope_id = OLD.id;

  IF tx_count > 0 THEN
    RAISE EXCEPTION 'Cannot delete envelope with % split transaction(s). Delete or reassign them first.', tx_count;
  END IF;

  RETURN OLD;
END;
$function$;

CREATE TRIGGER prevent_envelope_delete_with_transactions_trigger
BEFORE DELETE ON public.envelopes
FOR EACH ROW
EXECUTE FUNCTION public.prevent_envelope_delete_with_transactions();
