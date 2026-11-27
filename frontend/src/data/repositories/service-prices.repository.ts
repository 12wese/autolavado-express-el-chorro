import type { ServicePrice, SetServicePriceInput } from "@/domain/entities/service-price.entity";
import { apiClient } from "@/infrastructure/api/apiClient";

export async function fetchAllServicePrices(businessId: string): Promise<ServicePrice[]> {
  return apiClient.get<ServicePrice[]>("/api/prices", { businessId });
}

export async function upsertServicePrice(
  businessId: string,
  input: SetServicePriceInput,
): Promise<ServicePrice> {
  return apiClient.post<ServicePrice>("/api/prices", input, { businessId });
}
