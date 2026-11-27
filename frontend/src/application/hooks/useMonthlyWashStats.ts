import { useEffect, useState } from "react";
import { format } from "date-fns";
import {
  fetchWashStats,
  type WashStats,
} from "@/data/repositories/wash-jobs.repository";

export function useMonthlyWashStats(businessId: string | null, month: Date) {
  const [stats, setStats] = useState<WashStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    setStats(null);

    if (!businessId) {
      setLoading(false);
      return () => {
        active = false;
      };
    }

    fetchWashStats(businessId, format(month, "yyyy-MM"))
      .then((result) => {
        if (active) setStats(result);
      })
      .catch((requestError: unknown) => {
        if (active) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : "No se pudieron cargar las estadísticas.",
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [businessId, month]);

  return { stats, loading, error };
}
