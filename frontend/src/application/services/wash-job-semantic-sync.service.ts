import type { WashJob } from "@/domain/entities/wash-job.entity";
import { syncWashJobToFuseki } from "@/data/semantic/fuseki.repository";
import {
  fetchAllWashJobs,
  fetchWashJobById,
} from "@/data/repositories/wash-jobs.repository";

function getSemanticSyncInput(washJob: WashJob) {
  return {
    id: washJob.id,
    plate: washJob.license_plate,
    vehicleType: washJob.car_type,
    serviceType: washJob.wash_type,
    totalPrice: washJob.price,
    createdAt: washJob.created_at,
    status: washJob.status,
  };
}

async function syncInBackground(washJobPromise: Promise<WashJob>): Promise<void> {
  try {
    const washJob = await washJobPromise;
    await syncWashJobToFuseki(getSemanticSyncInput(washJob));
  } catch (error) {
    console.warn("No se pudo sincronizar el trabajo con el grafo semántico.", error);
  }
}

export function scheduleWashJobSemanticSync(washJob: WashJob): void {
  void syncInBackground(Promise.resolve(washJob));
}

export function scheduleWashJobSemanticSyncById(businessId: string, washJobId: string): void {
  void syncInBackground(fetchWashJobById(businessId, washJobId));
}

export interface ExistingWashJobsSyncResult {
  total: number;
  synced: number;
  failures: string[];
}

export async function syncExistingWashJobsToFuseki(
  businessId: string,
): Promise<ExistingWashJobsSyncResult> {
  const washJobs = await fetchAllWashJobs(businessId);
  const result: ExistingWashJobsSyncResult = {
    total: washJobs.length,
    synced: 0,
    failures: [],
  };

  for (const washJob of washJobs) {
    try {
      await syncWashJobToFuseki(getSemanticSyncInput(washJob));
      result.synced += 1;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error desconocido";
      result.failures.push(`${washJob.license_plate}: ${message}`);
    }
  }

  return result;
}
