import { getBackendClient } from '@/lib/backendClient';

const supabase = getBackendClient();

export type ActivityAction =
  | 'income_added'
  | 'income_updated'
  | 'income_deleted'
  | 'expense_added'
  | 'expense_updated'
  | 'expense_deleted'
  | 'envelope_created'
  | 'envelope_updated'
  | 'envelope_deleted'
  | 'allocation_made'
  | 'transfer_made'
  | 'recurring_created'
  | 'recurring_updated'
  | 'recurring_deleted'
  | 'member_joined'
  | 'member_left';

export interface ActivityLogEntry {
  id: string;
  userId: string;
  action: ActivityAction;
  entityType: string;
  entityId?: string;
  details?: Record<string, unknown>;
  createdAt: string;
  // Joined data
  userDisplayName?: string;
}

interface DbActivityLog {
  id: string;
  household_id: string;
  user_id: string;
  action: ActivityAction;
  entity_type: string;
  entity_id: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
}

interface QueryContext {
  userId: string;
  householdId?: string;
}

// Action labels for UI
export const actionLabels: Record<ActivityAction, string> = {
  income_added: 'a ajouté un revenu',
  income_updated: 'a modifié un revenu',
  income_deleted: 'a supprimé un revenu',
  expense_added: 'a ajouté une dépense',
  expense_updated: 'a modifié une dépense',
  expense_deleted: 'a supprimé une dépense',
  envelope_created: 'a créé une enveloppe',
  envelope_updated: 'a modifié une enveloppe',
  envelope_deleted: 'a supprimé une enveloppe',
  allocation_made: 'a alloué des fonds',
  transfer_made: 'a transféré des fonds',
  recurring_created: 'a créé une dépense récurrente',
  recurring_updated: 'a modifié une dépense récurrente',
  recurring_deleted: 'a supprimé une dépense récurrente',
  member_joined: 'a rejoint le ménage',
  member_left: 'a quitté le ménage',
};

// Action icons for UI
export const actionIcons: Record<ActivityAction, string> = {
  income_added: 'TrendingUp',
  income_updated: 'TrendingUp',
  income_deleted: 'TrendingUp',
  expense_added: 'TrendingDown',
  expense_updated: 'TrendingDown',
  expense_deleted: 'TrendingDown',
  envelope_created: 'Wallet',
  envelope_updated: 'Wallet',
  envelope_deleted: 'Wallet',
  allocation_made: 'ArrowRight',
  transfer_made: 'ArrowLeftRight',
  recurring_created: 'RefreshCw',
  recurring_updated: 'RefreshCw',
  recurring_deleted: 'RefreshCw',
  member_joined: 'UserPlus',
  member_left: 'UserMinus',
};

// Fetch activity log for household
export async function fetchActivityLog(
  ctx: QueryContext,
  limit: number = 50
): Promise<ActivityLogEntry[]> {
  if (!ctx.householdId) {
    // Activity log only works for households
    return [];
  }

  const { data, error } = await supabase
    .from('activity_log')
    .select(`
      *,
      profiles:user_id (
        display_name
      )
    `)
    .eq('household_id', ctx.householdId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching activity log:', error);
    return [];
  }

  return (data || []).map((entry: DbActivityLog & { profiles?: { display_name: string | null } }) => ({
    id: entry.id,
    userId: entry.user_id,
    action: entry.action,
    entityType: entry.entity_type,
    entityId: entry.entity_id || undefined,
    details: entry.details || undefined,
    createdAt: entry.created_at,
    userDisplayName: entry.profiles?.display_name || undefined,
  }));
}

// Log an activity
export async function logActivity(
  ctx: QueryContext,
  action: ActivityAction,
  entityType: string,
  entityId?: string,
  details?: Record<string, unknown>
): Promise<void> {
  // Only log for households
  if (!ctx.householdId) return;

  try {
    await supabase.from('activity_log').insert({
      household_id: ctx.householdId,
      user_id: ctx.userId,
      action,
      entity_type: entityType,
      entity_id: entityId || null,
      details: details || null,
    });
  } catch (error) {
    // Don't throw on activity log errors - it's non-critical
    console.error('Failed to log activity:', error);
  }
}

export type { QueryContext };
