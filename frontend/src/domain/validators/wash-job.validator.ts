import { z } from "zod";

export const newWashJobSchema = z.object({
  carType: z.string().min(1, "Selecciona un tipo de auto"),
  washTypes: z.array(z.string()).min(1, "Selecciona al menos un tipo de lavado"),
  washerId: z.string().uuid().nullable(),
  licensePlate: z.string().trim().min(1, "Ingresa la placa del vehículo").max(20),
  basePrice: z.number().finite().min(0, "El precio base debe ser mayor o igual a 0"),
  addonIds: z.array(z.string().uuid()).default([]).refine(
    (ids) => new Set(ids).size === ids.length,
    "No selecciones una adición más de una vez",
  ),
});

export type NewWashJobForm = z.infer<typeof newWashJobSchema>;
