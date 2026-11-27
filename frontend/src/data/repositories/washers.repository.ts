import { apiClient } from "@/infrastructure/api/apiClient";
import type { Washer } from "@/domain/entities/washer.entity";

export async function fetchAllWashers(businessId: string): Promise<Washer[]> {
  return apiClient.get<Washer[]>("/api/washers", { businessId });
}

export async function fetchWasherByToken(token: string): Promise<Washer | null> {
  return apiClient.get<Washer | null>(
    `/api/washers/by-token/${encodeURIComponent(token)}`,
  );
}

export async function createWasher(
  businessId: string,
  name: string,
  email: string,
): Promise<Washer> {
  return apiClient.post<Washer>("/api/washers", {
    name: name.trim(),
    email: email.trim(),
  }, { businessId });
}

export async function deleteWasher(businessId: string, id: string): Promise<void> {
  await apiClient.delete(`/api/washers/${encodeURIComponent(id)}`, { businessId });
}
