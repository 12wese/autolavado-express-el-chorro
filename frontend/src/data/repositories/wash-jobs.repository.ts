import { supabase } from "@/infrastructure/supabase/client";
import type {
  NewWashJobInput,
  WashJob,
  WashJobAddonSnapshot,
} from "@/domain/entities/wash-job.entity";
import type { WashJobStatusHistory } from "@/domain/entities/wash-job-status-history.entity";
import type { VehicleWashHistory } from "@/domain/entities/vehicle-wash-history.entity";
import type { WashStatus } from "@/domain/enums/wash-status.enum";
import { normalizeLicensePlate } from "@/domain/validators/vehicle-qr.validator";

type PersistedWashJob = Omit<WashJob, "addons">;

async function attachAddons(jobs: PersistedWashJob[]): Promise<WashJob[]> {
  if (jobs.length === 0) return [];

  const { data, error } = await supabase
    .from("wash_job_addons")
    .select("*")
    .in("wash_job_id", jobs.map((job) => job.id))
    .order("addon_name_snapshot", { ascending: true });

  if (error) throw error;

  const addonsByJob = new Map<string, WashJobAddonSnapshot[]>();
  for (const addon of (data ?? []) as WashJobAddonSnapshot[]) {
    const jobAddons = addonsByJob.get(addon.wash_job_id) ?? [];
    jobAddons.push(addon);
    addonsByJob.set(addon.wash_job_id, jobAddons);
  }

  return jobs.map((job) => ({ ...job, addons: addonsByJob.get(job.id) ?? [] }));
}

export async function fetchAllWashJobs(businessId: string): Promise<WashJob[]> {
  const { data, error } = await supabase
    .from("wash_jobs")
    .select("*")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return attachAddons((data ?? []) as PersistedWashJob[]);
}

export async function fetchWashJobsInRange(
  businessId: string,
  start: Date,
  end: Date,
): Promise<WashJob[]> {
  const { data, error } = await supabase
    .from("wash_jobs")
    .select("*")
    .eq("business_id", businessId)
    .gte("created_at", start.toISOString())
    .lte("created_at", end.toISOString())
    .order("created_at", { ascending: false });

  if (error) throw error;
  return attachAddons((data ?? []) as PersistedWashJob[]);
}

export async function fetchWashJobStatusHistory(
  washJobIds: string[],
): Promise<WashJobStatusHistory[]> {
  if (washJobIds.length === 0) return [];

  const { data, error } = await supabase
    .from("wash_job_status_history")
    .select("*")
    .in("wash_job_id", washJobIds)
    .order("changed_at", { ascending: true });

  if (error) throw error;
  return (data ?? []) as WashJobStatusHistory[];
}

export async function fetchRecentWashJobsByPlate(
  businessId: string,
  plate: string,
): Promise<VehicleWashHistory[]> {
  const { data, error } = await supabase.rpc("find_recent_wash_jobs_by_plate", {
    p_business_id: businessId,
    p_plate: normalizeLicensePlate(plate),
  });

  if (error) throw error;
  return data ?? [];
}

async function persistWashJob(businessId: string, input: NewWashJobInput): Promise<string> {
  const { data: washJobId, error } = await supabase.rpc("create_wash_job_with_addons", {
    p_business_id: businessId,
    p_washer_id: input.washer_id,
    p_car_type: input.car_type,
    p_wash_type: input.wash_type,
    p_license_plate: input.license_plate,
    p_base_price: input.base_price,
    p_addon_ids: input.addon_ids,
  });

  if (error) throw error;
  if (!washJobId) throw new Error("La base de datos no devolvió el ID del trabajo creado.");
  return washJobId;
}

export async function createWashJob(businessId: string, input: NewWashJobInput): Promise<string> {
  return persistWashJob(businessId, input);
}

export async function fetchWashJobById(businessId: string, id: string): Promise<WashJob> {
  const { data: job, error } = await supabase
    .from("wash_jobs")
    .select("*")
    .eq("business_id", businessId)
    .eq("id", id)
    .single();

  if (error) throw error;
  if (!job) throw new Error("No se pudo recuperar el trabajo recién creado.");

  const [createdJob] = await attachAddons([job as PersistedWashJob]);
  if (!createdJob) throw new Error("El trabajo no devolvió datos para el comprobante.");
  return createdJob;
}

export class WashJobReceiptUnavailableError extends Error {
  constructor(readonly washJobId: string, readonly originalError: unknown) {
    super("El trabajo se guardó, pero no se pudo recuperar el comprobante.");
    this.name = "WashJobReceiptUnavailableError";
  }
}

export async function createWashJobAndFetchReceipt(
  businessId: string,
  input: NewWashJobInput,
): Promise<WashJob> {
  const washJobId = await persistWashJob(businessId, input);

  try {
    return await fetchWashJobById(businessId, washJobId);
  } catch (error) {
    throw new WashJobReceiptUnavailableError(washJobId, error);
  }
}

export async function updateWashJobStatus(
  businessId: string,
  id: string,
  status: WashStatus,
): Promise<void> {
  const { error } = await supabase.rpc("advance_wash_job_status", {
    p_business_id: businessId,
    p_wash_job_id: id,
    p_new_status: status,
  });
  if (error) throw error;
}

export async function deleteWashJob(businessId: string, id: string): Promise<void> {
  const { error } = await supabase
    .from("wash_jobs")
    .delete()
    .eq("business_id", businessId)
    .eq("id", id);
  if (error) throw error;
}
