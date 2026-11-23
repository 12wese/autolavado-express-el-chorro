import { useCallback, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import type { Addon } from "@/domain/entities/addon.entity";
import type { ServicePrice } from "@/domain/entities/service-price.entity";
import type { BusinessRole } from "@/domain/enums/business-role.enum";
import type { WashJob } from "@/domain/entities/wash-job.entity";
import { canManageBusiness } from "@/domain/rules/business-permissions.rules";
import {
  calculateServicePriceBreakdown,
  findBasePrice,
  type ServicePriceBreakdown,
} from "@/domain/rules/pricing.rules";
import { quickWashJobSchema } from "@/domain/validators/quick-wash-job.validator";
import {
  createWashJobAndFetchReceipt,
  WashJobReceiptUnavailableError,
} from "@/data/repositories/wash-jobs.repository";
import {
  scheduleWashJobSemanticSync,
  scheduleWashJobSemanticSyncById,
} from "@/application/services/wash-job-semantic-sync.service";

interface QuickWashJobFormValues {
  carType: string;
  washType: string;
  licensePlate: string;
  washerId: string | null;
  addonIds: string[];
}

export type QuickWashJobResult =
  | { status: "created"; job: WashJob }
  | { status: "receipt-unavailable"; jobId: string }
  | null;

// El QR aporta la placa; el admin confirma los datos y la tarifa del negocio.
export function useQuickCreateWashJob(
  businessId: string,
  role: BusinessRole,
  onCreated: () => void,
) {
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { toast } = useToast();

  const computePriceBreakdown = useCallback((
    prices: ServicePrice[],
    addons: Addon[],
    carType: string,
    washType: string,
    addonIds: string[],
  ): ServicePriceBreakdown | null =>
    calculateServicePriceBreakdown(prices, addons, carType, washType, addonIds), []);

  const submit = async (
    values: QuickWashJobFormValues,
    prices: ServicePrice[]
  ): Promise<QuickWashJobResult> => {
    if (!canManageBusiness(role)) {
      toast({
        variant: "destructive",
        title: "Permiso denegado",
        description: "Solo un administrador puede crear trabajos.",
      });
      return null;
    }

    const result = quickWashJobSchema.safeParse(values);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) fieldErrors[err.path[0] as string] = err.message;
      });
      setErrors(fieldErrors);
      return null;
    }

    const basePrice = findBasePrice(prices, values.carType, values.washType);
    if (basePrice === null) {
      toast({
        variant: "destructive",
        title: "Sin precio definido",
        description: "No hay un precio configurado para esa combinación de auto y lavado. Agrégalo en Configuración.",
      });
      return null;
    }

    setErrors({});
    setLoading(true);
    try {
      const createdJob = await createWashJobAndFetchReceipt(businessId, {
        washer_id: values.washerId,
        car_type: values.carType,
        wash_type: values.washType,
        license_plate: result.data.licensePlate,
        base_price: basePrice,
        addon_ids: result.data.addonIds,
      });
      scheduleWashJobSemanticSync(createdJob);
      onCreated();
      return { status: "created", job: createdJob };
    } catch (error) {
      if (error instanceof WashJobReceiptUnavailableError) {
        scheduleWashJobSemanticSyncById(businessId, error.washJobId);
        onCreated();
        return { status: "receipt-unavailable", jobId: error.washJobId };
      }
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo crear el trabajo. Intenta de nuevo.",
      });
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { submit, computePriceBreakdown, loading, errors };
}
