import { format } from "date-fns";
import type {
  NewWashJobInput,
  WashJob,
} from "@/domain/entities/wash-job.entity";
import type { WashJobStatusHistory } from "@/domain/entities/wash-job-status-history.entity";
import type { VehicleWashHistory } from "@/domain/entities/vehicle-wash-history.entity";
import type { WashStatus } from "@/domain/enums/wash-status.enum";
import { apiClient } from "@/infrastructure/api/apiClient";
import { normalizeLicensePlate } from "@/domain/validators/vehicle-qr.validator";

export async function fetchAllWashJobs(businessId: string): Promise<WashJob[]> {
  return apiClient.get<WashJob[]>("/api/washes", { businessId });
}

export async function fetchWashJobsInRange(
  businessId: string,
  start: Date,
  end: Date,
): Promise<WashJob[]> {
  const query = new URLSearchParams({
    startDate: format(start, "yyyy-MM-dd"),
    endDate: format(end, "yyyy-MM-dd"),
  });
  return apiClient.get<WashJob[]>("/api/washes", { businessId, query });
}

export interface WashStats {
  total_jobs: number;
  total_earnings: number;
  washer_commission: number;
  business_commission: number;
  by_washer: Array<{
    washer_id: string | null;
    washer_name: string;
    total_jobs: number;
    total_earnings: number;
    washer_commission: number;
    business_commission: number;
  }>;
}

export async function fetchWashStats(
  businessId: string,
  month: string,
): Promise<WashStats> {
  const query = new URLSearchParams({ month });
  return apiClient.get<WashStats>("/api/washes/stats", { businessId, query });
}

export async function fetchWashJobStatusHistory(
  businessId: string,
  washJobIds: string[],
): Promise<WashJobStatusHistory[]> {
  if (washJobIds.length === 0) return [];
  const query = new URLSearchParams({ ids: washJobIds.join(",") });
  return apiClient.get<WashJobStatusHistory[]>("/api/washes/status-history", {
    businessId,
    query,
  });
}

export async function fetchRecentWashJobsByPlate(
  businessId: string,
  plate: string,
): Promise<VehicleWashHistory[]> {
  const query = new URLSearchParams({ plate: normalizeLicensePlate(plate) });
  const jobs = await apiClient.get<WashJob[]>("/api/washes", { businessId, query });
  return jobs.slice(0, 10);
}

async function persistWashJob(businessId: string, input: NewWashJobInput): Promise<WashJob> {
  return apiClient.post<WashJob>("/api/washes", input, { businessId });
}

export async function createWashJob(businessId: string, input: NewWashJobInput): Promise<string> {
  const job = await persistWashJob(businessId, input);
  return job.id;
}

export async function fetchWashJobById(businessId: string, id: string): Promise<WashJob> {
  return apiClient.get<WashJob>(`/api/washes/${encodeURIComponent(id)}`, { businessId });
}

export async function createWashJobAndFetchReceipt(
  businessId: string,
  input: NewWashJobInput,
): Promise<WashJob> {
  return persistWashJob(businessId, input);
}

export async function updateWashJobStatus(
  businessId: string,
  id: string,
  status: WashStatus,
): Promise<void> {
  await apiClient.patch<WashJob>(
    `/api/washes/${encodeURIComponent(id)}/status`,
    { status },
    { businessId },
  );
}

export async function deleteWashJob(businessId: string, id: string): Promise<void> {
  await apiClient.delete(`/api/washes/${encodeURIComponent(id)}`, { businessId });
}
