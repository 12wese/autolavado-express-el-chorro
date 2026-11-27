import type { Addon, NewAddonInput } from "@/domain/entities/addon.entity";
import { apiClient } from "@/infrastructure/api/apiClient";

export async function fetchAllAddons(businessId: string): Promise<Addon[]> {
  return apiClient.get<Addon[]>("/api/addons", { businessId });
}

export async function createAddon(
  businessId: string,
  input: NewAddonInput,
): Promise<Addon> {
  return apiClient.post<Addon>("/api/addons", input, { businessId });
}

export async function deleteAddon(businessId: string, id: string): Promise<void> {
  await apiClient.delete(`/api/addons/${encodeURIComponent(id)}`, { businessId });
}
