import type { VehicleWashHistory } from "@/domain/entities/vehicle-wash-history.entity";
import { WASH_TYPES } from "@/domain/catalog";
import { parseVehicleQrValue, resolveVehicleType } from "@/domain/validators/vehicle-qr.validator";
import {
  parsePlateAiResponse,
  type PlateAiRecognition,
} from "@/domain/validators/plate-ai.validator";
import { recognizePlateFromImage } from "@/data/repositories/plate-recognition.repository";
import { fetchRecentWashJobsByPlate } from "@/data/repositories/wash-jobs.repository";

export interface ScannedVehicle {
  plate: string;
  vehicleType: string | null;
  history: VehicleWashHistory[];
  recognition?: PlateAiRecognition;
}

export const minimumPlateConfidence = 0.8;

export interface ScannedVehicleDefaults {
  carType: string;
  washType: string;
}

export function getScannedVehicleDefaults(vehicle: ScannedVehicle): ScannedVehicleDefaults {
  const recentWashType = vehicle.history
    .map((job) => WASH_TYPES.find((washType) => washType === job.wash_type))
    .find((washType) => washType !== undefined);

  return {
    carType: vehicle.vehicleType ?? "Automóvil",
    washType: recentWashType ?? "Lavada General",
  };
}

export async function lookupScannedVehicle(
  qrValue: string,
  businessId: string,
): Promise<ScannedVehicle> {
  const payload = parseVehicleQrValue(qrValue);
  return lookupPlate(payload.plate, payload.vehicleType, businessId);
}

export async function recognizeScannedVehicle(
  imageBase64: string,
  businessId: string,
): Promise<{ recognition: PlateAiRecognition; vehicle: ScannedVehicle | null }> {
  const recognition = parsePlateAiResponse(await recognizePlateFromImage(imageBase64));
  if (!recognition.plate || recognition.confidence < minimumPlateConfidence) {
    return { recognition, vehicle: null };
  }

  const vehicle = await lookupPlate(
    recognition.plate,
    recognition.vehicleType === "moto"
      ? "Moto"
      : recognition.vehicleType === "camioneta"
        ? "Camioneta"
        : "Automóvil",
    businessId,
  );
  return { recognition, vehicle: { ...vehicle, recognition } };
}

async function lookupPlate(
  plate: string,
  detectedVehicleType: string | null,
  businessId: string,
): Promise<ScannedVehicle> {
  const history = await fetchRecentWashJobsByPlate(businessId, plate);
  const previousVehicleType = history
    .map((job) => resolveVehicleType(job.car_type))
    .find((vehicleType) => vehicleType !== null) ?? null;

  return {
    plate,
    vehicleType: detectedVehicleType ?? previousVehicleType,
    history,
  };
}
