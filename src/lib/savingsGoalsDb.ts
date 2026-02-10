import { getBackendClient } from '@/lib/backendClient';

const supabase = getBackendClient();

export type SavingsPriority = 'essential' | 'high' | 'medium' | 'low';

export interface SavingsGoal {
  id: string;
  envelope_id: string;
  target_amount: number;
  target_date: string | null;
  current_amount: number;
  name: string | null;
  priority: SavingsPriority;
  auto_contribute: boolean;
  monthly_contribution: number | null;
  contribution_percentage: number | null;
  is_paused: boolean;
  celebration_threshold: number[];
}

interface QueryContext {
  userId: string;
  householdId?: string;
}

export async function fetchSavingsGoals(ctx: QueryContext): Promise<SavingsGoal[]> {
  let query = supabase
    .from('savings_goals')
    .select('*');

  if (ctx.householdId) {
    query = query.eq('household_id', ctx.householdId);
  } else {
    query = query.eq('user_id', ctx.userId).is('household_id', null);
  }

  const { data, error } = await query;
  if (error) throw error;
  
  return (data || []).map((g: any) => ({
    id: g.id,
    envelope_id: g.envelope_id,
    target_amount: Number(g.target_amount),
    target_date: g.target_date,
    current_amount: Number(g.current_amount),
    name: g.name,
    priority: g.priority || 'medium',
    auto_contribute: g.auto_contribute || false,
    monthly_contribution: g.monthly_contribution != null ? Number(g.monthly_contribution) : null,
    contribution_percentage: g.contribution_percentage,
    is_paused: g.is_paused || false,
    celebration_threshold: g.celebration_threshold || [100],
  }));
}

export async function fetchSavingsGoalByEnvelope(ctx: QueryContext, envelopeId: string): Promise<SavingsGoal | null> {
  let query = supabase
    .from('savings_goals')
    .select('*')
    .eq('envelope_id', envelopeId);

  if (ctx.householdId) {
    query = query.eq('household_id', ctx.householdId);
  } else {
    query = query.eq('user_id', ctx.userId).is('household_id', null);
  }

  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  if (!data) return null;
  
  return {
    id: data.id,
    envelope_id: data.envelope_id,
    target_amount: Number(data.target_amount),
    target_date: data.target_date,
    current_amount: Number(data.current_amount),
    name: data.name,
    priority: data.priority || 'medium',
    auto_contribute: data.auto_contribute || false,
    monthly_contribution: data.monthly_contribution != null ? Number(data.monthly_contribution) : null,
    contribution_percentage: data.contribution_percentage,
    is_paused: data.is_paused || false,
    celebration_threshold: data.celebration_threshold || [100],
  };
}

export interface CreateSavingsGoalParams {
  envelopeId: string;
  targetAmount: number;
  targetDate?: string;
  name?: string;
  priority?: SavingsPriority;
  auto_contribute?: boolean;
  monthly_contribution?: number;
  contribution_percentage?: number;
  celebration_threshold?: number[];
}

export async function createSavingsGoal(
  ctx: QueryContext,
  params: CreateSavingsGoalParams
): Promise<string> {
  const { data, error } = await supabase
    .from('savings_goals')
    .insert({
      user_id: ctx.userId,
      household_id: ctx.householdId || null,
      envelope_id: params.envelopeId,
      target_amount: params.targetAmount,
      target_date: params.targetDate || null,
      current_amount: 0,
      name: params.name || null,
      priority: params.priority || 'medium',
      auto_contribute: params.auto_contribute || false,
      monthly_contribution: params.monthly_contribution || null,
      contribution_percentage: params.contribution_percentage || null,
      celebration_threshold: params.celebration_threshold || [100],
    } as any)
    .select('id')
    .single();

  if (error) throw error;
  return data.id;
}

export async function updateSavingsGoal(
  goalId: string,
  updates: {
    target_amount?: number;
    target_date?: string | null;
    current_amount?: number;
    name?: string | null;
    priority?: SavingsPriority;
    auto_contribute?: boolean;
    monthly_contribution?: number | null;
    contribution_percentage?: number | null;
    is_paused?: boolean;
    celebration_threshold?: number[];
  }
): Promise<void> {
  const { error } = await supabase
    .from('savings_goals')
    .update(updates)
    .eq('id', goalId);

  if (error) throw error;
}

export async function deleteSavingsGoal(goalId: string): Promise<void> {
  const { error } = await supabase
    .from('savings_goals')
    .delete()
    .eq('id', goalId);

  if (error) throw error;
}

export async function addToSavingsGoal(goalId: string, amount: number): Promise<void> {
  const { data: current, error: fetchError } = await supabase
    .from('savings_goals')
    .select('current_amount')
    .eq('id', goalId)
    .single();

  if (fetchError) throw fetchError;

  const { error } = await supabase
    .from('savings_goals')
    .update({ current_amount: Number(current.current_amount) + amount })
    .eq('id', goalId);

  if (error) throw error;
}
