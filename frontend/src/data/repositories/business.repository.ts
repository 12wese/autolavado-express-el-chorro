import type { CurrentBusinessMembership } from "@/domain/entities/business-membership.entity";
import { apiClient } from "@/infrastructure/api/apiClient";

interface CurrentBusinessResponse {
  memberships: CurrentBusinessMembership[];
  active: CurrentBusinessMembership | null;
}

export async function fetchCurrentBusinessMemberships(): Promise<CurrentBusinessMembership[]> {
  const response = await apiClient.get<CurrentBusinessResponse>("/api/business/current");
  return response.memberships;
}

export async function createBusiness(name: string): Promise<string> {
  const membership = await apiClient.post<CurrentBusinessMembership>("/api/business", {
    name: name.trim(),
  });
  return membership.business_id;
}
