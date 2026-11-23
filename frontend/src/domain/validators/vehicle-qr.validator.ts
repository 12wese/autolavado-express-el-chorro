import { z } from "zod";
import { CAR_TYPES } from "@/domain/catalog";

export function normalizeLicensePlate(value: string): string {
  return value.toUpperCase().replace(/[\s-]/g, "");
}

const colombianPlatePattern =
  /(?:^|[^A-Z0-9])([A-Z]{3}[\s-]*\d{3}|[A-Z]{3}[\s-]*\d{2}[\s-]*[A-Z])(?=$|[^A-Z0-9])/g;

export const licensePlateSchema = z
  .string()
  .trim()
  .min(1, "Ingresa la placa del vehículo")
  .max(20, "La placa es demasiado larga")
  .transform(normalizeLicensePlate)
  .pipe(z.string().regex(/^[A-Z0-9]{5,8}$/, "La placa debe tener entre 5 y 8 letras o números"));

export function extractColombianPlateCandidate(text: string): string | null {
  for (const match of text.toUpperCase().matchAll(colombianPlatePattern)) {
    const result = licensePlateSchema.safeParse(match[1]);
    if (result.success) return result.data;
  }
  return null;
}

const vehicleQrSchema = z.object({
  plate: licensePlateSchema,
  vehicleType: z.string().trim().max(40).nullish(),
});

function normalizeVehicleType(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

const vehicleTypeAliases: Record<string, string> = {
  auto: "Automóvil",
  automobile: "Automóvil",
  car: "Automóvil",
  carro: "Automóvil",
  camioneta: "Camioneta",
  moto: "Moto",
  motocicleta: "Moto",
  pickup: "Pickup",
  suv: "SUV",
  van: "Van",
};

export function resolveVehicleType(value: string | null | undefined): string | null {
  if (!value?.trim()) return null;

  const normalized = normalizeVehicleType(value);
  const alias = vehicleTypeAliases[normalized];
  if (alias) return alias;

  return CAR_TYPES.find((type) => normalizeVehicleType(type) === normalized) ?? null;
}

function decodeVehicleQrValue(value: string): unknown {
  const trimmed = value.trim();
  if (trimmed.startsWith("{")) {
    try {
      return JSON.parse(trimmed) as unknown;
    } catch {
      return { plate: trimmed };
    }
  }

  if (/^https?:\/\//i.test(trimmed)) {
    const url = new URL(trimmed);
    const plate =
      url.searchParams.get("plate")
      ?? url.searchParams.get("licensePlate")
      ?? url.searchParams.get("license_plate")
      ?? decodeURIComponent(url.pathname.split("/").filter(Boolean).pop() ?? "");
    const vehicleType =
      url.searchParams.get("vehicleType")
      ?? url.searchParams.get("vehicle_type")
      ?? url.searchParams.get("type");

    return { plate, vehicleType };
  }

  return { plate: trimmed };
}

export interface VehicleQrPayload {
  plate: string;
  vehicleType: string | null;
}

export function parseVehicleQrValue(value: string): VehicleQrPayload {
  const payload = vehicleQrSchema.parse(decodeVehicleQrValue(value));
  return {
    plate: payload.plate,
    vehicleType: resolveVehicleType(payload.vehicleType),
  };
}
