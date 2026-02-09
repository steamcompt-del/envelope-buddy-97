import { getBackendClient } from '@/lib/backendClient';

const supabase = getBackendClient();

export interface SavingsGoal {
  id: string;
  envelope_id: string;
  target_amount: number;
  target_date: string | null;
  current_amount: number;
  name: string | null;
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
  };
}

export async function createSavingsGoal(
  ctx: QueryContext,
  envelopeId: string,
  targetAmount: number,
  targetDate?: string,
  name?: string
): Promise<string> {
  const { data, error } = await supabase
    .from('savings_goals')
    .insert({
      user_id: ctx.userId,
      household_id: ctx.householdId || null,
      envelope_id: envelopeId,
      target_amount: targetAmount,
      target_date: targetDate || null,
      current_amount: 0,
      name: name || null,
    })
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
