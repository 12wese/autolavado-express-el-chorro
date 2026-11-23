import type { BusinessRole } from "@/domain/enums/business-role.enum";

export function canManageBusiness(role: BusinessRole | null): boolean {
  return role === "admin";
}

export function canManageConfiguration(role: BusinessRole | null): boolean {
  return role === "admin";
}

export function canViewWashJob(
  role: BusinessRole | null,
  currentBusinessId: string | null,
  jobBusinessId: string,
  currentWasherId: string | null,
  jobWasherId: string | null,
): boolean {
  if (!currentBusinessId || currentBusinessId !== jobBusinessId) return false;
  if (role === "admin") return true;
  return role === "washer" && currentWasherId !== null && currentWasherId === jobWasherId;
}

export function canAdvanceWashJob(
  role: BusinessRole | null,
  currentBusinessId: string | null,
  jobBusinessId: string,
  currentWasherId: string | null,
  jobWasherId: string | null,
): boolean {
  return canViewWashJob(role, currentBusinessId, jobBusinessId, currentWasherId, jobWasherId);
}
