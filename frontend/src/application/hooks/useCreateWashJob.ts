import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import type { BusinessRole } from "@/domain/enums/business-role.enum";
import { canManageBusiness } from "@/domain/rules/business-permissions.rules";
import { newWashJobSchema } from "@/domain/validators/wash-job.validator";
import { createWashJob } from "@/data/repositories/wash-jobs.repository";
import { scheduleWashJobSemanticSyncById } from "@/application/services/wash-job-semantic-sync.service";

interface NewWashJobFormValues {
  carType: string;
  washTypes: string[];
  washerId: string | null;
  licensePlate: string;
  basePrice: number;
  addonIds: string[];
}

// Caso de uso: crear un nuevo trabajo de lavado a partir del formulario.
export function useCreateWashJob(
  businessId: string,
  role: BusinessRole,
  onCreated: () => void,
) {
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { toast } = useToast();

  const submit = async (values: NewWashJobFormValues): Promise<boolean> => {
    if (!canManageBusiness(role)) {
      toast({
        variant: "destructive",
        title: "Permiso denegado",
        description: "Solo un administrador puede crear trabajos.",
      });
      return false;
    }

    const result = newWashJobSchema.safeParse(values);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) fieldErrors[err.path[0] as string] = err.message;
      });
      setErrors(fieldErrors);
      return false;
    }

    setErrors({});
    setLoading(true);

    try {
      const washJobId = await createWashJob(businessId, {
        washer_id: values.washerId,
        car_type: values.carType,
        wash_type: values.washTypes.join(", "),
        license_plate: values.licensePlate.trim().toUpperCase(),
        base_price: values.basePrice,
        addon_ids: result.data.addonIds,
      });
      scheduleWashJobSemanticSyncById(businessId, washJobId);

      onCreated();
      return true;
    } catch {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo crear el trabajo. Intenta de nuevo.",
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  return { submit, loading, errors, setErrors };
}
