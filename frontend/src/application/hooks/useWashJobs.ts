import { useCallback, useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import type { WashJob } from "@/domain/entities/wash-job.entity";
import type { WashStatus } from "@/domain/enums/wash-status.enum";
import { isWashStatusTransitionAllowed } from "@/domain/rules/wash-status.rules";
import type { BusinessRole } from "@/domain/enums/business-role.enum";
import { canAdvanceWashJob, canManageBusiness } from "@/domain/rules/business-permissions.rules";
import {
  deleteWashJob,
  fetchAllWashJobs,
  updateWashJobStatus,
} from "@/data/repositories/wash-jobs.repository";

// Caso de uso del tablero Kanban: cargar, mover y eliminar trabajos de lavado.
export function useWashJobs(
  businessId: string | null,
  role: BusinessRole | null,
  washerId: string | null,
) {
  const [jobs, setJobs] = useState<WashJob[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const loadJobs = useCallback(async () => {
    setLoading(true);
    setJobs([]);
    if (!businessId) {
      setLoading(false);
      return;
    }
    try {
      const data = await fetchAllWashJobs(businessId);
      setJobs(data);
    } catch {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudieron cargar los trabajos.",
      });
    } finally {
      setLoading(false);
    }
  }, [businessId, toast]);

  useEffect(() => {
    loadJobs();
  }, [loadJobs]);

  const changeStatus = useCallback(
    async (id: string, newStatus: WashStatus, newStatusLabel: string) => {
      const currentJob = jobs.find((job) => job.id === id);
      if (
        !businessId
        || !currentJob
        || !canAdvanceWashJob(
          role,
          businessId,
          currentJob.business_id,
          washerId,
          currentJob.washer_id,
        )
        || !isWashStatusTransitionAllowed(currentJob.status, newStatus)
      ) {
        toast({
          variant: "destructive",
          title: "Transición no válida",
          description: "Los trabajos solo pueden avanzar al siguiente estado.",
        });
        return;
      }

      try {
        await updateWashJobStatus(businessId, id, newStatus);
        setJobs((prev) => prev.map((job) => (job.id === id ? { ...job, status: newStatus } : job)));
        toast({
          title: "Estado actualizado",
          description: `El trabajo se movió a "${newStatusLabel}".`,
        });
      } catch {
        toast({
          variant: "destructive",
          title: "Error",
          description: "No se pudo actualizar el estado.",
        });
      }
    },
    [businessId, jobs, role, toast, washerId]
  );

  const removeJob = useCallback(
    async (id: string) => {
      if (!businessId || !canManageBusiness(role)) return;
      try {
        await deleteWashJob(businessId, id);
        setJobs((prev) => prev.filter((job) => job.id !== id));
        toast({
          title: "Trabajo eliminado",
          description: "El trabajo ha sido eliminado correctamente.",
        });
      } catch {
        toast({
          variant: "destructive",
          title: "Error",
          description: "No se pudo eliminar el trabajo.",
        });
      }
    },
    [businessId, role, toast]
  );

  return { jobs, loading, changeStatus, removeJob };
}
