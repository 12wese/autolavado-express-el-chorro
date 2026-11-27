import { useCallback, useEffect, useMemo, useState } from "react";
import type { CurrentBusinessMembership } from "@/domain/entities/business-membership.entity";
import {
  createBusiness,
  fetchCurrentBusinessMemberships,
} from "@/data/repositories/business.repository";

const ACTIVE_BUSINESS_KEY = "autolavado-active-business-id";

export function useBusinessContext(userId: string | null) {
  const [memberships, setMemberships] = useState<CurrentBusinessMembership[]>([]);
  const [activeBusinessId, setActiveBusinessId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async (): Promise<CurrentBusinessMembership[]> => {
    if (!userId) {
      setMemberships([]);
      setActiveBusinessId(null);
      setLoading(false);
      return [];
    }

    setLoading(true);
    setError(null);
    try {
      const currentMemberships = await fetchCurrentBusinessMemberships();
      setMemberships(currentMemberships);
      const storedBusinessId = window.localStorage.getItem(ACTIVE_BUSINESS_KEY);
      const selectedMembership = currentMemberships.find(
        (membership) => membership.business_id === storedBusinessId,
      );
      const nextBusinessId = selectedMembership?.business_id
        ?? currentMemberships[0]?.business_id
        ?? null;
      setActiveBusinessId(nextBusinessId);
      if (nextBusinessId) {
        window.localStorage.setItem(ACTIVE_BUSINESS_KEY, nextBusinessId);
      } else {
        window.localStorage.removeItem(ACTIVE_BUSINESS_KEY);
      }
      return currentMemberships;
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "No se pudo cargar el negocio.");
      throw loadError;
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void refresh().catch(() => undefined);
  }, [refresh]);

  const activeMembership = useMemo(
    () => memberships.find((membership) => membership.business_id === activeBusinessId) ?? null,
    [memberships, activeBusinessId],
  );

  const selectBusiness = useCallback((businessId: string) => {
    setActiveBusinessId(businessId);
    window.localStorage.setItem(ACTIVE_BUSINESS_KEY, businessId);
  }, []);

  const addBusiness = useCallback(async (name: string) => {
    setError(null);
    try {
      const businessId = await createBusiness(name);
      await refresh();
      selectBusiness(businessId);
      return true;
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "No se pudo crear el negocio.");
      return false;
    }
  }, [refresh, selectBusiness]);

  return {
    memberships,
    activeMembership,
    activeBusinessId,
    loading,
    error,
    refresh,
    selectBusiness,
    addBusiness,
  };
}
