import { useEffect, useState } from "react";
import { endOfMonth, startOfMonth } from "date-fns";
import type { WashJob } from "@/domain/entities/wash-job.entity";
import { fetchWashJobsInRange } from "@/data/repositories/wash-jobs.repository";

// Caso de uso compartido por Historial y Estadísticas: los trabajos de un mes dado.
export function useMonthlyWashJobs(businessId: string | null, month: Date) {
  const [jobs, setJobs] = useState<WashJob[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setJobs([]);

    if (!businessId) {
      setJobs([]);
      setLoading(false);
      return () => {
        active = false;
      };
    }

    fetchWashJobsInRange(businessId, startOfMonth(month), endOfMonth(month))
      .then((data) => {
        if (active) setJobs(data);
      })
      .catch((error) => {
        console.error("Error al obtener los trabajos del mes:", error);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [businessId, month]);

  return { jobs, loading };
}
