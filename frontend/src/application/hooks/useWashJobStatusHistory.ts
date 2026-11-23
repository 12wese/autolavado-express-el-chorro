import { useEffect, useMemo, useState } from "react";
import type { WashJobStatusHistory } from "@/domain/entities/wash-job-status-history.entity";
import { fetchWashJobStatusHistory } from "@/data/repositories/wash-jobs.repository";

export function useWashJobStatusHistory(washJobIds: string[]) {
  const jobIdsKey = useMemo(
    () => [...new Set(washJobIds)].sort().join(","),
    [washJobIds],
  );
  const [history, setHistory] = useState<WashJobStatusHistory[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const ids = jobIdsKey ? jobIdsKey.split(",") : [];

    if (ids.length === 0) {
      setHistory([]);
      setError(null);
      setLoading(false);
      return () => {
        active = false;
      };
    }

    setLoading(true);
    setError(null);
    setHistory([]);
    fetchWashJobStatusHistory(ids)
      .then((data) => {
        if (active) setHistory(data);
      })
      .catch((fetchError: unknown) => {
        console.error("Error al obtener la trazabilidad de los lavados:", fetchError);
        if (active) setError("No se pudo cargar la trazabilidad de los lavados.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [jobIdsKey]);

  const historyByJobId = useMemo(() => {
    return history.reduce<Record<string, WashJobStatusHistory[]>>((grouped, event) => {
      (grouped[event.wash_job_id] ??= []).push(event);
      return grouped;
    }, {});
  }, [history]);

  return { historyByJobId, loading, error };
}
