import { useCallback, useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import type { BusinessRole } from "@/domain/enums/business-role.enum";
import type { Addon } from "@/domain/entities/addon.entity";
import { canManageConfiguration } from "@/domain/rules/business-permissions.rules";
import { newAddonSchema } from "@/domain/validators/quick-wash-job.validator";
import { createAddon, deleteAddon, fetchAllAddons } from "@/data/repositories/addons.repository";

export function useAddons(
  businessId: string | null,
  userId: string | null,
  role: BusinessRole | null,
) {
  const [addons, setAddons] = useState<Addon[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    setAddons([]);
    if (!businessId) {
      setLoading(false);
      return;
    }
    try {
      setAddons(await fetchAllAddons(businessId));
    } catch {
      toast({ variant: "destructive", title: "Error", description: "No se pudieron cargar las adiciones." });
    } finally {
      setLoading(false);
    }
  }, [businessId, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const addAddon = useCallback(
    async (name: string, price: number) => {
      if (!businessId || !userId || !canManageConfiguration(role)) {
        toast({ variant: "destructive", title: "Permiso denegado", description: "Solo un administrador puede modificar las adiciones." });
        return false;
      }
      const result = newAddonSchema.safeParse({ name, price });
      if (!result.success) {
        toast({ variant: "destructive", title: "Error", description: result.error.errors[0].message });
        return false;
      }
      try {
        const addon = await createAddon(businessId, userId, {
          name: result.data.name,
          price: result.data.price,
        });
        setAddons((prev) => [...prev, addon].sort((a, b) => a.name.localeCompare(b.name)));
        return true;
      } catch {
        toast({ variant: "destructive", title: "Error", description: "No se pudo crear la adición." });
        return false;
      }
    },
    [businessId, role, toast, userId]
  );

  const removeAddon = useCallback(
    async (id: string) => {
      if (!canManageConfiguration(role)) {
        toast({ variant: "destructive", title: "Permiso denegado", description: "Solo un administrador puede modificar las adiciones." });
        return;
      }
      try {
        await deleteAddon(id);
        setAddons((prev) => prev.filter((a) => a.id !== id));
      } catch {
        toast({ variant: "destructive", title: "Error", description: "No se pudo eliminar la adición." });
      }
    },
    [role, toast]
  );

  return { addons, loading, addAddon, removeAddon };
}
