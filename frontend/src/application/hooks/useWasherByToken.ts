import { useCallback, useState } from "react";
import type { Washer } from "@/domain/entities/washer.entity";
import { fetchWasherByToken } from "@/data/repositories/washers.repository";
import { extractWasherQrToken } from "@/domain/validators/washer-qr-token.validator";

// Caso de uso: resolver el lavador a partir del token leído en su código QR.
export function useWasherByToken() {
  const [washer, setWasher] = useState<Washer | null>(null);
  const [loading, setLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const lookup = useCallback(async (qrValue: string) => {
    const token = extractWasherQrToken(qrValue);
    setWasher(null);
    setLoading(true);
    setNotFound(false);
    setError(null);
    if (!token) {
      setLoading(false);
      setNotFound(true);
      return null;
    }

    try {
      const found = await fetchWasherByToken(token);
      setWasher(found);
      setNotFound(!found);
      return found;
    } catch (lookupError) {
      setError(
        lookupError instanceof Error
          ? lookupError.message
          : "No se pudo consultar el código QR del lavador.",
      );
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setWasher(null);
    setNotFound(false);
    setError(null);
  }, []);

  return { washer, loading, notFound, error, lookup, reset };
}
