import { useCallback, useState } from "react";
import type { Washer } from "@/domain/entities/washer.entity";
import { fetchWasherByToken } from "@/data/repositories/washers.repository";

// Caso de uso: resolver el lavador a partir del token leído en su código QR.
export function useWasherByToken() {
  const [washer, setWasher] = useState<Washer | null>(null);
  const [loading, setLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);

  const lookup = useCallback(async (token: string) => {
    setLoading(true);
    setNotFound(false);
    try {
      const found = await fetchWasherByToken(token);
      setWasher(found);
      setNotFound(!found);
      return found;
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setWasher(null);
    setNotFound(false);
  }, []);

  return { washer, loading, notFound, lookup, reset };
}
