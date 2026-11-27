import { useCallback, useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import type { BusinessRole } from "@/domain/enums/business-role.enum";
import type { ServicePrice } from "@/domain/entities/service-price.entity";
import { canManageConfiguration } from "@/domain/rules/business-permissions.rules";
import { fetchAllServicePrices, upsertServicePrice } from "@/data/repositories/service-prices.repository";

export function useServicePrices(
  businessId: string | null,
  userId: string | null,
  role: BusinessRole | null,
) {
  const [prices, setPrices] = useState<ServicePrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const { toast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    setPrices([]);
    setLoadError(false);
    if (!businessId) {
      setLoading(false);
      return;
    }
    try {
      setPrices(await fetchAllServicePrices(businessId));
    } catch {
      setLoadError(true);
      toast({ variant: "destructive", title: "Error", description: "No se pudo cargar la lista de precios." });
    } finally {
      setLoading(false);
    }
  }, [businessId, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const setPrice = useCallback(
    async (carType: string, washType: string, price: number) => {
      if (!businessId || !userId || !canManageConfiguration(role)) {
        toast({ variant: "destructive", title: "Permiso denegado", description: "Solo un administrador puede modificar los precios." });
        return false;
      }
      try {
        const updated = await upsertServicePrice(businessId, {
          car_type: carType,
          wash_type: washType,
          price,
        });
        setPrices((prev) => {
          const next = prev.filter((p) => !(p.car_type === carType && p.wash_type === washType));
          return [...next, updated];
        });
        return true;
      } catch {
        toast({ variant: "destructive", title: "Error", description: "No se pudo guardar el precio." });
        return false;
      }
    },
    [businessId, role, toast, userId]
  );

  return { prices, loading, loadError, setPrice };
}
