import { getBackendClient } from '@/lib/backendClient';

const supabase = getBackendClient();

export interface Household {
  id: string;
  name: string;
  invite_code: string;
  created_at: string;
}

export interface HouseholdMember {
  id: string;
  household_id: string;
  user_id: string;
  joined_at: string;
}

// Get all user's households
export async function getUserHouseholds(userId: string): Promise<Household[]> {
  const { data: members } = await supabase
    .from('household_members')
    .select('household_id')
    .eq('user_id', userId);

  if (!members || members.length === 0) return [];

  const householdIds = members.map(m => m.household_id);
  
  const { data: households } = await supabase
    .from('households')
    .select('*')
    .in('id', householdIds);

  return households || [];
}

// Get the user's primary household (first one, for backward compatibility)
export async function getUserHousehold(userId: string): Promise<Household | null> {
  const households = await getUserHouseholds(userId);
  return households.length > 0 ? households[0] : null;
}

// Get household members
export async function getHouseholdMembers(householdId: string): Promise<HouseholdMember[]> {
  const { data } = await supabase
    .from('household_members')
    .select('*')
    .eq('household_id', householdId);

  return data || [];
}

// Create a new household
export async function createHousehold(userId: string, name: string = 'Mon Ménage'): Promise<Household> {
  // Create household
  const { data: household, error: householdError } = await supabase
    .from('households')
    .insert({
      name,
      created_by: userId,
    })
    .select()
    .single();

  if (householdError) throw householdError;

  // Add creator as member
  const { error: memberError } = await supabase
    .from('household_members')
    .insert({
      household_id: household.id,
      user_id: userId,
    });

  if (memberError) throw memberError;

  return household;
}

// Join a household by invite code
export async function joinHouseholdByCode(userId: string, inviteCode: string): Promise<Household> {
  // Find household by invite code
  const { data: household, error: findError } = await supabase
    .from('households')
    .select('*')
    .eq('invite_code', inviteCode.toUpperCase().trim())
    .single();

  if (findError || !household) {
    throw new Error('Code d\'invitation invalide');
  }

  // Check if user is already a member
  const { data: existingMember } = await supabase
    .from('household_members')
    .select('id')
    .eq('household_id', household.id)
    .eq('user_id', userId)
    .single();

  if (existingMember) {
    throw new Error('Vous êtes déjà membre de ce ménage');
  }

  // Add user as member
  const { error: joinError } = await supabase
    .from('household_members')
    .insert({
      household_id: household.id,
      user_id: userId,
    });

  if (joinError) throw joinError;

  return household;
}

// Leave household
export async function leaveHousehold(userId: string, householdId: string): Promise<void> {
  const { error } = await supabase
    .from('household_members')
    .delete()
    .eq('user_id', userId)
    .eq('household_id', householdId);

  if (error) throw error;
}

// Delete household (only for creator)
export async function deleteHousehold(householdId: string): Promise<void> {
  // First delete all members
  await supabase
    .from('household_members')
    .delete()
    .eq('household_id', householdId);

  // Then delete the household
  const { error } = await supabase
    .from('households')
    .delete()
    .eq('id', householdId);

  if (error) throw error;
}

// Update household name
export async function updateHouseholdName(householdId: string, name: string): Promise<void> {
  const { error } = await supabase
    .from('households')
    .update({ name })
    .eq('id', householdId);

  if (error) throw error;
}

// Regenerate invite code
export async function regenerateInviteCode(householdId: string): Promise<string> {
  const newCode = Math.random().toString(36).substring(2, 10).toUpperCase();
  
  const { data, error } = await supabase
    .from('households')
    .update({ invite_code: newCode })
    .eq('id', householdId)
    .select('invite_code')
    .single();

  if (error) throw error;
  return data.invite_code;
}

// Migrate user data to household (when creating or joining)
export async function migrateUserDataToHousehold(userId: string, householdId: string): Promise<void> {
  // Update all tables to use household_id
  const updates = [
    supabase.from('envelopes').update({ household_id: householdId }).eq('user_id', userId).is('household_id', null),
    supabase.from('envelope_allocations').update({ household_id: householdId }).eq('user_id', userId).is('household_id', null),
    supabase.from('incomes').update({ household_id: householdId }).eq('user_id', userId).is('household_id', null),
    supabase.from('monthly_budgets').update({ household_id: householdId }).eq('user_id', userId).is('household_id', null),
    supabase.from('transactions').update({ household_id: householdId }).eq('user_id', userId).is('household_id', null),
    supabase.from('receipts').update({ household_id: householdId }).eq('user_id', userId).is('household_id', null),
  ];

  await Promise.all(updates);
}
