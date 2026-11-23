import { z } from "zod";

const carPlatePattern = /^[A-Z]{3}\d{3}$/;
const motorcyclePlatePattern = /^(?:[A-Z]{3}\d{2}[A-Z]?|\d{3}[A-Z]{3})$/;

function normalizePlate(value: string): string {
  return value.toUpperCase().replace(/[\s.-]/g, "");
}

const plateAiResponseSchema = z.object({
  plate: z.string().nullable(),
  vehicleType: z.enum(["automovil", "camioneta", "moto"]).nullable(),
  confidence: z.number().min(0).max(1),
  rawText: z.string(),
}).transform((response, context) => {
  const plate = response.plate === null ? null : normalizePlate(response.plate);
  if (plate !== null
    && !carPlatePattern.test(plate)
    && !motorcyclePlatePattern.test(plate)) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["plate"],
      message: "La placa no cumple un formato colombiano reconocido",
    });
    return z.NEVER;
  }

  const inferredType = plate === null
    ? null
    : carPlatePattern.test(plate)
      ? "automovil"
      : "moto";
  if (plate === null && response.vehicleType !== null) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["vehicleType"],
      message: "Sin una placa legible, el tipo de vehículo debe ser null",
    });
    return z.NEVER;
  }
  const vehicleType = response.vehicleType ?? inferredType;
  if (plate !== null && vehicleType === "moto" && carPlatePattern.test(plate)) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["vehicleType"],
      message: "El tipo moto no coincide con el formato de la placa",
    });
    return z.NEVER;
  }
  if (plate !== null && vehicleType !== "moto" && motorcyclePlatePattern.test(plate)) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["vehicleType"],
      message: "El tipo de vehículo no coincide con el formato de la placa",
    });
    return z.NEVER;
  }

  return { ...response, plate, vehicleType };
});

export type PlateAiRecognition = z.infer<typeof plateAiResponseSchema>;

export function parsePlateAiResponse(value: unknown): PlateAiRecognition {
  return plateAiResponseSchema.parse(value);
}
