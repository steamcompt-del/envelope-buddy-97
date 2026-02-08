import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  Household,
  getUserHouseholds,
  createHousehold,
  joinHouseholdByCode,
  leaveHousehold,
  updateHouseholdName,
  regenerateInviteCode,
  migrateUserDataToHousehold,
} from '@/lib/householdDb';

const ACTIVE_HOUSEHOLD_KEY = 'activeHouseholdId';

export function useHousehold() {
  const { user } = useAuth();
  const [households, setHouseholds] = useState<Household[]>([]);
  const [activeHouseholdId, setActiveHouseholdId] = useState<string | null>(() => {
    return localStorage.getItem(ACTIVE_HOUSEHOLD_KEY);
  });
  const [loading, setLoading] = useState(true);
  const [needsSetup, setNeedsSetup] = useState(false);

  // Get the currently active household
  const household = households.find(h => h.id === activeHouseholdId) || households[0] || null;

  const loadHouseholds = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const loadedHouseholds = await getUserHouseholds(user.id);
      setHouseholds(loadedHouseholds);
      
      // If active household is not in the list, select the first one
      if (loadedHouseholds.length > 0) {
        const storedId = localStorage.getItem(ACTIVE_HOUSEHOLD_KEY);
        const isValidStored = loadedHouseholds.some(h => h.id === storedId);
        if (!isValidStored) {
          setActiveHouseholdId(loadedHouseholds[0].id);
          localStorage.setItem(ACTIVE_HOUSEHOLD_KEY, loadedHouseholds[0].id);
        }
        setNeedsSetup(false);
      } else {
        setNeedsSetup(true);
      }
    } catch (error) {
      console.error('Error loading households:', error);
      setNeedsSetup(true);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadHouseholds();
  }, [loadHouseholds]);

  const switchHousehold = useCallback((householdId: string) => {
    const exists = households.some(h => h.id === householdId);
    if (exists) {
      setActiveHouseholdId(householdId);
      localStorage.setItem(ACTIVE_HOUSEHOLD_KEY, householdId);
    }
  }, [households]);

  const create = useCallback(async (name: string = 'Mon Ménage') => {
    if (!user) throw new Error('Not authenticated');
    const newHousehold = await createHousehold(user.id, name);
    // Migrate existing data to household only if this is the first household
    if (households.length === 0) {
      await migrateUserDataToHousehold(user.id, newHousehold.id);
    }
    setHouseholds(prev => [...prev, newHousehold]);
    setActiveHouseholdId(newHousehold.id);
    localStorage.setItem(ACTIVE_HOUSEHOLD_KEY, newHousehold.id);
    setNeedsSetup(false);
    return newHousehold;
  }, [user, households.length]);

  const join = useCallback(async (inviteCode: string) => {
    if (!user) throw new Error('Not authenticated');
    const joinedHousehold = await joinHouseholdByCode(user.id, inviteCode);
    setHouseholds(prev => [...prev, joinedHousehold]);
    setActiveHouseholdId(joinedHousehold.id);
    localStorage.setItem(ACTIVE_HOUSEHOLD_KEY, joinedHousehold.id);
    setNeedsSetup(false);
    return joinedHousehold;
  }, [user]);

  const leave = useCallback(async (householdIdToLeave?: string) => {
    if (!user) return;
    const targetId = householdIdToLeave || household?.id;
    if (!targetId) return;
    
    await leaveHousehold(user.id, targetId);
    
    const remaining = households.filter(h => h.id !== targetId);
    setHouseholds(remaining);
    
    if (remaining.length > 0) {
      setActiveHouseholdId(remaining[0].id);
      localStorage.setItem(ACTIVE_HOUSEHOLD_KEY, remaining[0].id);
      setNeedsSetup(false);
    } else {
      setActiveHouseholdId(null);
      localStorage.removeItem(ACTIVE_HOUSEHOLD_KEY);
      setNeedsSetup(true);
    }
  }, [user, household?.id, households]);

  const updateName = useCallback(async (name: string) => {
    if (!household) return;
    await updateHouseholdName(household.id, name);
    setHouseholds(prev => prev.map(h => 
      h.id === household.id ? { ...h, name } : h
    ));
  }, [household]);

  const regenerateCode = useCallback(async () => {
    if (!household) return '';
    const newCode = await regenerateInviteCode(household.id);
    setHouseholds(prev => prev.map(h => 
      h.id === household.id ? { ...h, invite_code: newCode } : h
    ));
    return newCode;
  }, [household]);

  return {
    household,
    households,
    loading,
    needsSetup,
    switchHousehold,
    create,
    join,
    leave,
    updateName,
    regenerateCode,
    refresh: loadHouseholds,
  };
}
