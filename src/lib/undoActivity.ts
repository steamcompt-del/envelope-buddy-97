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
  const details = activity.details as Record<string, unknown> | undefined;
  // Must have undo_data and not already undone
  if (details?.undone === true) return false;
  return !!details?.undo_data;
}

/**
 * Helper: verify an envelope still exists, throw if not.
 */
async function assertEnvelopeExists(envelopeId: string, label?: string): Promise<void> {
  const { data } = await supabase
    .from('envelopes')
    .select('id')
    .eq('id', envelopeId)
    .maybeSingle();
  if (!data) throw new Error(label || 'L\'enveloppe n\'existe plus');
}

/**
 * Lock the activity row by marking it undone FIRST (optimistic lock).
 * Returns the fresh details if successful, throws if already undone.
 */
async function acquireUndoLock(activityId: string): Promise<Record<string, unknown>> {
  // Fetch fresh state from DB to prevent race conditions
  const { data: fresh, error } = await supabase
    .from('activity_log')
    .select('details')
    .eq('id', activityId)
    .single();

  if (error || !fresh) throw new Error('Activité introuvable');

  const details = fresh.details as Record<string, unknown> | null;
  if (details?.undone === true) {
    throw new Error('Cette action a déjà été annulée');
  }

  // Mark as undone immediately (optimistic lock)
  const updatedDetails = { ...details, undone: true, undone_at: new Date().toISOString() };
  const { error: updateError } = await supabase
    .from('activity_log')
    .update({ details: updatedDetails })
    .eq('id', activityId);

  if (updateError) throw new Error('Impossible de verrouiller l\'action pour annulation');

  return details || {};
}

/**
 * Rollback the undo lock if the actual undo operation fails.
 */
async function releaseUndoLock(activityId: string, originalDetails: Record<string, unknown>): Promise<void> {
  try {
    const restored = { ...originalDetails };
    delete restored.undone;
    delete restored.undone_at;
    await supabase
      .from('activity_log')
      .update({ details: restored })
      .eq('id', activityId);
  } catch {
    console.error('Failed to rollback undo lock for activity', activityId);
  }
}

/**
 * Undo an activity action.
 * Uses an optimistic lock pattern: marks as undone first, then executes.
 * If the operation fails, the lock is released.
 */
export async function undoActivity(
  ctx: UndoContext,
  activity: ActivityLogEntry,
  monthKey: string,
): Promise<void> {
  // Step 1: Acquire lock (marks undone in DB, prevents double-undo)
  const freshDetails = await acquireUndoLock(activity.id);
  const undoData = freshDetails.undo_data as Record<string, unknown> | undefined;

  if (!undoData) {
    await releaseUndoLock(activity.id, freshDetails);
    throw new Error('Pas de données d\'annulation disponibles');
  }

  const queryCtx = { userId: ctx.userId, householdId: ctx.householdId };

  try {
    switch (activity.action) {
      case 'income_added': {
        const incomeId = activity.entityId;
        const amount = undoData.amount as number;
        if (!incomeId) throw new Error('ID du revenu manquant');
        await deleteIncomeDb(queryCtx, monthKey, incomeId, amount);
        break;
      }

      case 'income_deleted': {
        const amount = undoData.amount as number;
        const description = undoData.description as string;
        const date = undoData.date as string | undefined;
        await addIncomeDb(queryCtx, monthKey, amount, description, date ? new Date(date) : undefined);
        break;
      }

      case 'expense_added': {
        const txId = activity.entityId;
        if (!txId) throw new Error('ID de la dépense manquant');
        // Verify transaction still exists before trying to delete
        const { data: tx } = await supabase
          .from('transactions')
          .select('id')
          .eq('id', txId)
          .maybeSingle();
        if (!tx) throw new Error('La transaction n\'existe plus (déjà supprimée ?)');
        await deleteTransactionCompleteDb(queryCtx, monthKey, txId);
        break;
      }

      case 'expense_deleted': {
        const envelopeId = undoData.envelope_id as string;
        const amount = undoData.amount as number;
        const description = undoData.description as string;
        const merchant = undoData.merchant as string | undefined;
        const date = undoData.date as string | undefined;
        
        await assertEnvelopeExists(envelopeId, 'L\'enveloppe associée n\'existe plus');
        await addTransactionDb(queryCtx, monthKey, envelopeId, amount, description, merchant, undefined, undefined, date);
        break;
      }

      case 'allocation_made': {
        const envelopeId = activity.entityId;
        const amount = undoData.amount as number;
        const kind = undoData.kind as string | undefined;
        if (!envelopeId) throw new Error('ID de l\'enveloppe manquant');
        
        await assertEnvelopeExists(envelopeId, 'L\'enveloppe n\'existe plus');

        if (kind === 'initial_balance') {
          // Initial balance: just remove the allocation without touching toBeBudgeted
          await supabase.rpc('adjust_allocation_atomic', {
            p_envelope_id: envelopeId,
            p_month_key: monthKey,
            p_amount: -amount,
          });
        } else if (kind === 'withdrawal') {
          // Withdrawal was a deallocation (negative amount logged)
          // Undo = re-allocate the abs amount back to the envelope
          // This takes from toBeBudgeted, which is the reverse of the original deallocation
          await allocateToEnvelopeDb(queryCtx, monthKey, envelopeId, Math.abs(amount));
        } else if (amount > 0) {
          // Normal allocation: deallocate (returns to toBeBudgeted)
          await deallocateFromEnvelopeDb(queryCtx, monthKey, envelopeId, amount);
        } else if (amount < 0) {
          // Negative allocation: re-allocate
          await allocateToEnvelopeDb(queryCtx, monthKey, envelopeId, Math.abs(amount));
        }
        break;
      }

      case 'transfer_made': {
        const fromId = undoData.from_envelope_id as string;
        const toId = undoData.to_envelope_id as string;
        const amount = undoData.amount as number;
        if (!fromId || !toId) throw new Error('IDs des enveloppes manquants');
        
        // Verify both envelopes still exist
        await assertEnvelopeExists(toId, 'L\'enveloppe de destination n\'existe plus');
        await assertEnvelopeExists(fromId, 'L\'enveloppe source n\'existe plus');
        
        // Reverse: transfer from toId back to fromId
        await transferBetweenEnvelopesDb(queryCtx, monthKey, toId, fromId, amount);
        break;
      }

      case 'envelope_created': {
        const envelopeId = activity.entityId;
        if (!envelopeId) throw new Error('ID de l\'enveloppe manquant');
        
        // Check if envelope has transactions — can't undo if it does
        const { count } = await supabase
          .from('transactions')
          .select('id', { count: 'exact', head: true })
          .eq('envelope_id', envelopeId);
        
        if (count && count > 0) {
          throw new Error(`Impossible d'annuler : l'enveloppe contient ${count} transaction(s). Supprimez-les d'abord.`);
        }

        const allocated = (undoData.allocated as number) || 0;
        await deleteEnvelopeDb(queryCtx, monthKey, envelopeId, allocated, true);
        break;
      }

      case 'envelope_deleted': {
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
  } catch (error) {
    // Undo operation failed — release the lock so user can retry
    await releaseUndoLock(activity.id, freshDetails);
    throw error;
  }
  // Lock stays: activity is now permanently marked as undone
}
