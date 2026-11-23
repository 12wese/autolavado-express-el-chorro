import { useCallback, useRef, useState } from "react";
import type {
  ScannedVehicle,
} from "@/application/services/scanned-vehicle.service";
import {
  lookupScannedVehicle,
  minimumPlateConfidence,
  recognizeScannedVehicle,
} from "@/application/services/scanned-vehicle.service";
import type { PlateAiRecognition } from "@/domain/validators/plate-ai.validator";

export function useScannedVehicle(businessId: string) {
  const [vehicle, setVehicle] = useState<ScannedVehicle | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recognition, setRecognition] = useState<PlateAiRecognition | null>(null);
  const requestIdRef = useRef(0);

  const lookup = useCallback(async (qrValue: string): Promise<ScannedVehicle | null> => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setError(null);
    try {
      const result = await lookupScannedVehicle(qrValue, businessId);
      if (requestId !== requestIdRef.current) return null;
      setVehicle(result);
      setRecognition(null);
      return result;
    } catch (lookupError) {
      if (requestId !== requestIdRef.current) return null;
      setVehicle(null);
      setError(
        lookupError instanceof Error
          ? lookupError.message
          : "No se pudo consultar el historial de la placa.",
      );
      return null;
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, [businessId]);

  const recognize = useCallback(async (imageBase64: string): Promise<ScannedVehicle | null> => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setError(null);
    try {
      const result = await recognizeScannedVehicle(imageBase64, businessId);
      if (requestId !== requestIdRef.current) return null;
      setRecognition(result.recognition);
      setVehicle(result.vehicle);
      if (!result.vehicle) {
        setError(
          result.recognition.plate
            && result.recognition.confidence < minimumPlateConfidence
            ? "La placa no se reconoció con suficiente confianza. Ajusta el encuadre e inténtalo de nuevo."
            : "No se encontró una placa colombiana legible. Ajusta el encuadre e inténtalo de nuevo.",
        );
      }
      return result.vehicle;
    } catch (recognitionError) {
      if (requestId !== requestIdRef.current) return null;
      setVehicle(null);
      setError(
        recognitionError instanceof Error
          ? recognitionError.message
          : "No se pudo analizar la placa con IA.",
      );
      throw recognitionError;
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, [businessId]);

  const reset = useCallback(() => {
    requestIdRef.current += 1;
    setVehicle(null);
    setError(null);
    setRecognition(null);
    setLoading(false);
  }, []);

  return { vehicle, loading, error, recognition, lookup, recognize, reset };
}
