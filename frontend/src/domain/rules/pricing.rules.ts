import type { Addon } from "@/domain/entities/addon.entity";
import type { ServicePrice } from "@/domain/entities/service-price.entity";

// Encuentra el precio base para una combinación de tipo de auto + tipo de lavado.
// Si no hay un precio definido para esa combinación, no se puede cobrar automático.
export function findBasePrice(
  prices: ServicePrice[],
  carType: string,
  washType: string
): number | null {
  const match = prices.find((p) => p.car_type === carType && p.wash_type === washType);
  return match ? match.price : null;
}

// Precio final = precio base + suma de las adiciones seleccionadas.
export function calculateTotalPrice(basePrice: number, selectedAddons: Addon[]): number {
  const baseCents = Math.round((basePrice + Number.EPSILON) * 100);
  const addonsCents = selectedAddons.reduce(
    (sum, addon) => sum + Math.round((addon.price + Number.EPSILON) * 100),
    0,
  );
  return (baseCents + addonsCents) / 100;
}

export interface ServicePriceBreakdown {
  basePrice: number;
  addons: Addon[];
  totalPrice: number;
}

export function calculateServicePriceBreakdown(
  prices: ServicePrice[],
  addons: Addon[],
  carType: string,
  washType: string,
  selectedAddonIds: string[],
): ServicePriceBreakdown | null {
  const basePrice = findBasePrice(prices, carType, washType);
  if (basePrice === null) return null;

  const selectedAddons = addons.filter((addon) => selectedAddonIds.includes(addon.id));
  return {
    basePrice,
    addons: selectedAddons,
    totalPrice: calculateTotalPrice(basePrice, selectedAddons),
  };
}

export function calculateServicePrice(
  prices: ServicePrice[],
  addons: Addon[],
  carType: string,
  washType: string,
  selectedAddonIds: string[],
): number | null {
  return calculateServicePriceBreakdown(prices, addons, carType, washType, selectedAddonIds)
    ?.totalPrice ?? null;
}
