import { useCallback, useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import type { BusinessRole } from "@/domain/enums/business-role.enum";
import type { Washer } from "@/domain/entities/washer.entity";
import { canManageBusiness } from "@/domain/rules/business-permissions.rules";
import { newWasherSchema } from "@/domain/validators/quick-wash-job.validator";
import { createWasher, deleteWasher, fetchAllWashers } from "@/data/repositories/washers.repository";

export function useWashers(
  businessId: string | null,
  role: BusinessRole | null,
) {
  const [washers, setWashers] = useState<Washer[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    setWashers([]);
    if (!businessId) {
      setLoading(false);
      return;
    }
    try {
      setWashers(await fetchAllWashers(businessId));
    } catch {
      toast({ variant: "destructive", title: "Error", description: "No se pudieron cargar los lavadores." });
    } finally {
      setLoading(false);
    }
  }, [businessId, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const addWasher = useCallback(
    async (name: string, email: string) => {
      if (!businessId || !canManageBusiness(role)) {
        toast({ variant: "destructive", title: "Permiso denegado", description: "Solo un administrador puede invitar lavadores." });
        return false;
      }
      const result = newWasherSchema.safeParse({ name, email });
      if (!result.success) {
        toast({ variant: "destructive", title: "Error", description: result.error.errors[0].message });
        return false;
      }
      try {
        const washer = await createWasher(businessId, result.data.name, email);
        setWashers((prev) => [...prev, washer].sort((a, b) => a.name.localeCompare(b.name)));
        return true;
      } catch {
        toast({ variant: "destructive", title: "Error", description: "No se pudo crear el lavador." });
        return false;
      }
    },
    [businessId, role, toast]
  );

  const removeWasher = useCallback(
    async (id: string) => {
      if (!canManageBusiness(role)) {
        toast({ variant: "destructive", title: "Permiso denegado", description: "Solo un administrador puede eliminar lavadores." });
        return;
      }
      try {
        await deleteWasher(id);
        setWashers((prev) => prev.filter((w) => w.id !== id));
      } catch {
        toast({ variant: "destructive", title: "Error", description: "No se pudo eliminar el lavador." });
      }
    },
    [role, toast]
  );

  return { washers, loading, addWasher, removeWasher };
}
