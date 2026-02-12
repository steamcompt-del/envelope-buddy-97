import { getBackendClient } from '@/lib/backendClient';
import { 
  addIncomeDb,
  deleteIncomeDb,
  addTransactionDb,
  deleteTransactionCompleteDb,
  allocateToEnvelopeDb,
  deallocateFromEnvelopeDb,
  transferBetweenEnvelopesDb,
  createEnvelopeDb,
  deleteEnvelopeDb,
} from '@/lib/budgetDb';
import type { ActivityAction, ActivityLogEntry } from '@/lib/activityDb';

const supabase = getBackendClient();

interface UndoContext {
  userId: string;
  householdId?: string;
}

// Supported undo actions
const UNDOABLE_ACTIONS: Set<ActivityAction> = new Set([
  'income_added',
  'income_deleted',
  'expense_added',
  'expense_deleted',
  'allocation_made',
  'transfer_made',
  'envelope_created',
  'envelope_deleted',
]);

export function isUndoable(activity: ActivityLogEntry): boolean {
  if (!UNDOABLE_ACTIONS.has(activity.action)) return false;
  // Must have undo_data
  const details = activity.details as Record<string, unknown> | undefined;
  return !!details?.undo_data;
}

/**
 * Undo an activity action.
 * Returns true if successful, throws on error.
 */
export async function undoActivity(
  ctx: UndoContext,
  activity: ActivityLogEntry,
  monthKey: string,
): Promise<void> {
  const details = activity.details as Record<string, unknown> | undefined;
  const undoData = details?.undo_data as Record<string, unknown> | undefined;
  if (!undoData) throw new Error('Pas de données d\'annulation disponibles');

  const queryCtx = { userId: ctx.userId, householdId: ctx.householdId };

  switch (activity.action) {
    case 'income_added': {
      // Undo: delete the income
      const incomeId = activity.entityId;
      const amount = undoData.amount as number;
      if (!incomeId) throw new Error('ID du revenu manquant');
      await deleteIncomeDb(queryCtx, monthKey, incomeId, amount);
      break;
    }

    case 'income_deleted': {
      // Undo: re-create the income
      const amount = undoData.amount as number;
      const description = undoData.description as string;
      const date = undoData.date as string | undefined;
      await addIncomeDb(queryCtx, monthKey, amount, description, date ? new Date(date) : undefined);
      break;
    }

    case 'expense_added': {
      // Undo: delete the transaction
      const txId = activity.entityId;
      if (!txId) throw new Error('ID de la dépense manquant');
      await deleteTransactionCompleteDb(queryCtx, monthKey, txId);
      break;
    }

    case 'expense_deleted': {
      // Undo: re-create the transaction
      const envelopeId = undoData.envelope_id as string;
      const amount = undoData.amount as number;
      const description = undoData.description as string;
      const merchant = undoData.merchant as string | undefined;
      const date = undoData.date as string | undefined;
      
      // Check envelope still exists
      const { data: env } = await supabase
        .from('envelopes')
        .select('id')
        .eq('id', envelopeId)
        .maybeSingle();
      if (!env) throw new Error('L\'enveloppe associée n\'existe plus');
      
      await addTransactionDb(queryCtx, monthKey, envelopeId, amount, description, merchant, undefined, undefined, date);
      break;
    }

    case 'allocation_made': {
      // Undo: reverse the allocation
      const envelopeId = activity.entityId;
      const amount = undoData.amount as number;
      const kind = undoData.kind as string | undefined;
      if (!envelopeId) throw new Error('ID de l\'enveloppe manquant');
      
      // Check envelope still exists
      const { data: env } = await supabase
        .from('envelopes')
        .select('id')
        .eq('id', envelopeId)
        .maybeSingle();
      if (!env) throw new Error('L\'enveloppe n\'existe plus');

      if (kind === 'initial_balance') {
        // Initial balance: just remove the allocation without touching toBeBudgeted
        await supabase.rpc('adjust_allocation_atomic', {
          p_envelope_id: envelopeId,
          p_month_key: monthKey,
          p_amount: -amount,
        });
      } else if (amount > 0) {
        // Normal allocation: deallocate
        await deallocateFromEnvelopeDb(queryCtx, monthKey, envelopeId, amount);
      } else if (amount < 0) {
        // Deallocation: re-allocate
        await allocateToEnvelopeDb(queryCtx, monthKey, envelopeId, Math.abs(amount));
      }
      break;
    }

    case 'transfer_made': {
      // Undo: reverse the transfer
      const fromId = undoData.from_envelope_id as string;
      const toId = undoData.to_envelope_id as string;
      const amount = undoData.amount as number;
      if (!fromId || !toId) throw new Error('IDs des enveloppes manquants');
      
      // Reverse: transfer from toId back to fromId
      await transferBetweenEnvelopesDb(queryCtx, monthKey, toId, fromId, amount);
      break;
    }

    case 'envelope_created': {
      // Undo: delete the envelope
      const envelopeId = activity.entityId;
      if (!envelopeId) throw new Error('ID de l\'enveloppe manquant');
      const allocated = (undoData.allocated as number) || 0;
      await deleteEnvelopeDb(queryCtx, monthKey, envelopeId, allocated, true);
      break;
    }

    case 'envelope_deleted': {
      // Undo: re-create the envelope
      const name = undoData.name as string;
      const icon = undoData.icon as string || 'Wallet';
      const color = undoData.color as string || 'blue';
      const category = undoData.category as string || 'essentiels';
      const allocated = (undoData.allocated as number) || 0;
      const refunded = undoData.refunded as boolean;
      
      const newId = await createEnvelopeDb(queryCtx, monthKey, name, icon, color, category);
      
      // Restore allocation if it was refunded
      if (allocated > 0 && refunded) {
        await allocateToEnvelopeDb(queryCtx, monthKey, newId, allocated);
      } else if (allocated > 0 && !refunded) {
        // Was not refunded, so just add allocation without deducting from toBeBudgeted
        await supabase.rpc('adjust_allocation_atomic', {
          p_envelope_id: newId,
          p_month_key: monthKey,
          p_amount: allocated,
        });
      }
      break;
    }

    default:
      throw new Error(`Action "${activity.action}" non annulable`);
  }

  // Mark activity as undone
  await supabase
    .from('activity_log')
    .update({ details: { ...details, undone: true, undone_at: new Date().toISOString() } })
    .eq('id', activity.id);
}
