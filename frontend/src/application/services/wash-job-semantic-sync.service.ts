import type { WashJob } from "@/domain/entities/wash-job.entity";
import { syncWashJobToFuseki } from "@/data/semantic/fuseki.repository";
import { fetchWashJobById } from "@/data/repositories/wash-jobs.repository";

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
