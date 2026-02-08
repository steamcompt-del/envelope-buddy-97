import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  Household,
  getUserHousehold,
  createHousehold,
  joinHouseholdByCode,
  leaveHousehold,
  updateHouseholdName,
  regenerateInviteCode,
  migrateUserDataToHousehold,
} from '@/lib/householdDb';

export function useHousehold() {
  const { user } = useAuth();
  const [household, setHousehold] = useState<Household | null>(null);
  const [loading, setLoading] = useState(true);
  const [needsSetup, setNeedsSetup] = useState(false);

  const loadHousehold = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const h = await getUserHousehold(user.id);
      setHousehold(h);
      setNeedsSetup(!h);
    } catch (error) {
      console.error('Error loading household:', error);
      setNeedsSetup(true);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadHousehold();
  }, [loadHousehold]);

  const create = useCallback(async (name: string = 'Mon Ménage') => {
    if (!user) throw new Error('Not authenticated');
    const newHousehold = await createHousehold(user.id, name);
    // Migrate existing data to household
    await migrateUserDataToHousehold(user.id, newHousehold.id);
    setHousehold(newHousehold);
    setNeedsSetup(false);
    return newHousehold;
  }, [user]);

  const join = useCallback(async (inviteCode: string) => {
    if (!user) throw new Error('Not authenticated');
    const joinedHousehold = await joinHouseholdByCode(user.id, inviteCode);
    // Note: When joining, user's personal data stays separate if they had any
    // They will now see the shared household data
    setHousehold(joinedHousehold);
    setNeedsSetup(false);
    return joinedHousehold;
  }, [user]);

  const leave = useCallback(async () => {
    if (!user || !household) return;
    await leaveHousehold(user.id, household.id);
    setHousehold(null);
    setNeedsSetup(true);
  }, [user, household]);

  const updateName = useCallback(async (name: string) => {
    if (!household) return;
    await updateHouseholdName(household.id, name);
    setHousehold({ ...household, name });
  }, [household]);

  const regenerateCode = useCallback(async () => {
    if (!household) return '';
    const newCode = await regenerateInviteCode(household.id);
    setHousehold({ ...household, invite_code: newCode });
    return newCode;
  }, [household]);

  return {
    household,
    loading,
    needsSetup,
    create,
    join,
    leave,
    updateName,
    regenerateCode,
    refresh: loadHousehold,
  };
}
