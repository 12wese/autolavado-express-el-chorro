import { z } from "zod";
import { licensePlateSchema } from "./vehicle-qr.validator";

export const quickWashJobSchema = z.object({
  carType: z.string().min(1, "Selecciona un tipo de auto"),
  washType: z.string().min(1, "Selecciona un tipo de lavado"),
  licensePlate: licensePlateSchema,
  washerId: z.string().uuid().nullable(),
  addonIds: z.array(z.string().uuid()).default([]).refine(
    (ids) => new Set(ids).size === ids.length,
    "No selecciones una adición más de una vez",
  ),
});

export type QuickWashJobForm = z.infer<typeof quickWashJobSchema>;

export const newAddonSchema = z.object({
  name: z.string().trim().min(1, "Ingresa el nombre de la adición").max(60),
  price: z.number().min(0, "El precio debe ser mayor o igual a 0"),
});

export const newWasherSchema = z.object({
  name: z.string().trim().min(1, "Ingresa el nombre del lavador").max(100),
  email: z.string().trim().email("Ingresa un correo válido").max(320),
});

export const servicePriceSchema = z.object({
  car_type: z.string().min(1),
  wash_type: z.string().min(1),
  price: z.number().min(0, "El precio debe ser mayor o igual a 0"),
});
