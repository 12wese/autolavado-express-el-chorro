import { z } from 'zod';
import type { SupabaseClient } from '@supabase/supabase-js';
import { HttpError } from '../lib/http-error';

const uuid = z.string().uuid();

export const createWashSchema = z.object({
  businessId: uuid.optional(),
  washer_id: uuid.nullable().default(null),
  car_type: z.string().trim().min(1).max(100),
  wash_type: z.string().trim().min(1).max(200),
  license_plate: z.string().trim().min(1).max(20),
  base_price: z.number().finite().min(0).max(1_000_000),
  addon_ids: z.array(uuid).max(100).refine(
    (ids) => new Set(ids).size === ids.length,
    'Addon IDs must be unique',
  ).default([]),
});

export const updateWashStatusSchema = z.object({
  status: z.enum(['pending', 'in_progress', 'completed', 'delivered']),
});

const washFiltersSchema = z.object({
  businessId: uuid.optional(),
  month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  plate: z.string().trim().min(1).max(20).optional(),
}).superRefine((filters, context) => {
  const dateRangeProvided = filters.startDate !== undefined || filters.endDate !== undefined;
  const singleDateProvided = filters.date !== undefined || filters.month !== undefined;
  if (filters.month && filters.date) {
    context.addIssue({
      code: 'custom',
      message: 'Use either month or date, not both',
      path: ['date'],
    });
  }
  if (dateRangeProvided && singleDateProvided) {
    context.addIssue({
      code: 'custom',
      message: 'Use either month/date or startDate/endDate filters',
      path: ['startDate'],
    });
  }
  if (dateRangeProvided && (!filters.startDate || !filters.endDate)) {
    context.addIssue({
      code: 'custom',
      message: 'Both startDate and endDate are required',
      path: ['startDate'],
    });
  }
  for (const key of ['date', 'startDate', 'endDate'] as const) {
    const value = filters[key];
    if (value) {
      const parsed = new Date(`${value}T00:00:00.000Z`);
      if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
        context.addIssue({ code: 'custom', message: `${key} is not a valid date`, path: [key] });
      }
    }
  }
  if (filters.startDate && filters.endDate && filters.startDate > filters.endDate) {
    context.addIssue({
      code: 'custom',
      message: 'startDate must be on or before endDate',
      path: ['startDate'],
    });
  }
});

export type WashFilters = z.infer<typeof washFiltersSchema>;

export function parseWashFilters(value: unknown): WashFilters {
  return washFiltersSchema.parse(value);
}

function getDateRange(filters: WashFilters): { start?: string; end?: string } {
  if (filters.month) {
    const [year, month] = filters.month.split('-').map(Number);
    return {
      start: new Date(Date.UTC(year, month - 1, 1)).toISOString(),
      end: new Date(Date.UTC(year, month, 1) - 1).toISOString(),
    };
  }
  const startDate = filters.date ?? filters.startDate;
  const endDate = filters.date ?? filters.endDate;
  return {
    start: startDate ? new Date(`${startDate}T00:00:00.000Z`).toISOString() : undefined,
    end: endDate ? new Date(`${endDate}T23:59:59.999Z`).toISOString() : undefined,
  };
}

function normalizePlate(value: string): string {
  const plate = value.toUpperCase().replace(/[\s-]/g, '');
  if (!/^[A-Z0-9]{5,8}$/.test(plate)) {
    throw new HttpError(400, 'Plate must contain 5 to 8 letters or numbers');
  }
  return plate;
}

async function attachAddons<T extends { id: string }>(
  client: SupabaseClient,
  jobs: T[],
): Promise<Array<T & { addons: unknown[] }>> {
  if (jobs.length === 0) return [];
  const { data, error } = await client
    .from('wash_job_addons')
    .select('*')
    .in('wash_job_id', jobs.map((job) => job.id))
    .order('addon_name_snapshot', { ascending: true });
  if (error) throw error;

  const grouped = new Map<string, unknown[]>();
  for (const addon of data ?? []) {
    const items = grouped.get(addon.wash_job_id) ?? [];
    items.push(addon);
    grouped.set(addon.wash_job_id, items);
  }
  return jobs.map((job) => ({ ...job, addons: grouped.get(job.id) ?? [] }));
}

async function fetchWashes(
  client: SupabaseClient,
  businessId: string,
  filters: WashFilters,
) {
  let query = client
    .from('wash_jobs')
    .select('*')
    .eq('business_id', businessId)
    .order('created_at', { ascending: false });

  const range = getDateRange(filters);
  if (range.start) query = query.gte('created_at', range.start);
  if (range.end) query = query.lte('created_at', range.end);
  if (filters.plate) query = query.ilike('license_plate', normalizePlate(filters.plate));

  const { data, error } = await query;
  if (error) throw error;
  return attachAddons(client, data ?? []);
}

export async function listWashes(
  client: SupabaseClient,
  businessId: string,
  filters: WashFilters,
) {
  return fetchWashes(client, businessId, filters);
}

export async function fetchWashById(
  client: SupabaseClient,
  businessId: string,
  washId: string,
) {
  const { data, error } = await client
    .from('wash_jobs')
    .select('*')
    .eq('business_id', businessId)
    .eq('id', washId)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new HttpError(404, 'Wash job was not found');
  const [job] = await attachAddons(client, [data]);
  if (!job) throw new HttpError(404, 'Wash job was not found');
  return job;
}

export async function listWashJobStatusHistory(
  client: SupabaseClient,
  washJobIds: string[],
) {
  if (washJobIds.length === 0) return [];
  const { data, error } = await client
    .from('wash_job_status_history')
    .select('*')
    .in('wash_job_id', washJobIds)
    .order('changed_at', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function createWash(
  client: SupabaseClient,
  businessId: string,
  input: z.infer<typeof createWashSchema>,
) {
  const { data: id, error } = await client.rpc('create_wash_job_with_addons', {
    p_business_id: businessId,
    p_washer_id: input.washer_id,
    p_car_type: input.car_type,
    p_wash_type: input.wash_type,
    p_license_plate: normalizePlate(input.license_plate),
    p_base_price: input.base_price,
    p_addon_ids: input.addon_ids,
  });
  if (error) throw error;
  if (typeof id !== 'string') {
    throw new Error('Database did not return the created wash ID');
  }

  const { data: job, error: fetchError } = await client
    .from('wash_jobs')
    .select('*')
    .eq('business_id', businessId)
    .eq('id', id)
    .single();
  if (fetchError) throw fetchError;
  if (!job) throw new Error(`Created wash ${id} could not be retrieved`);
  const [created] = await attachAddons(client, [job]);
  if (!created) throw new Error(`Created wash ${id} could not be retrieved`);
  return created;
}

export async function deleteWash(
  client: SupabaseClient,
  businessId: string,
  washId: string,
) {
  const { data, error } = await client
    .from('wash_jobs')
    .delete()
    .eq('business_id', businessId)
    .eq('id', washId)
    .select('id')
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new HttpError(404, 'Wash job was not found');
}

const statusTransitions: Record<string, string | null> = {
  pending: 'in_progress',
  in_progress: 'completed',
  completed: 'delivered',
  delivered: null,
};

export async function advanceWashStatus(
  client: SupabaseClient,
  businessId: string,
  washId: string,
  newStatus: z.infer<typeof updateWashStatusSchema>['status'],
) {
  const { data: current, error: fetchError } = await client
    .from('wash_jobs')
    .select('status')
    .eq('business_id', businessId)
    .eq('id', washId)
    .maybeSingle();
  if (fetchError) throw fetchError;
  if (!current) throw new HttpError(404, 'Wash job was not found');
  if (statusTransitions[current.status] !== newStatus) {
    throw new HttpError(400, `Invalid wash status transition from ${current.status} to ${newStatus}`);
  }

  const { error } = await client.rpc('advance_wash_job_status', {
    p_business_id: businessId,
    p_wash_job_id: washId,
    p_new_status: newStatus,
  });
  if (error) throw error;

  const { data: updated, error: updatedError } = await client
    .from('wash_jobs')
    .select('*')
    .eq('business_id', businessId)
    .eq('id', washId)
    .single();
  if (updatedError) throw updatedError;
  const [job] = await attachAddons(client, updated ? [updated] : []);
  return job;
}

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export async function calculateWashStats(
  client: SupabaseClient,
  businessId: string,
  filters: WashFilters,
) {
  const jobs = await fetchWashes(client, businessId, filters);
  const byWasher = new Map<string, {
    washer_id: string | null;
    washer_name: string;
    total_jobs: number;
    total_earnings: number;
  }>();

  for (const job of jobs) {
    const key = job.washer_id ?? 'unassigned';
    const entry = byWasher.get(key) ?? {
      washer_id: job.washer_id,
      washer_name: job.washer_name,
      total_jobs: 0,
      total_earnings: 0,
    };
    entry.total_jobs += 1;
    entry.total_earnings = roundMoney(entry.total_earnings + Number(job.price ?? 0));
    byWasher.set(key, entry);
  }

  const washerStats = [...byWasher.values()].map((washer) => ({
    ...washer,
    washer_commission: roundMoney(washer.total_earnings * 0.4),
    business_commission: roundMoney(washer.total_earnings * 0.6),
  }));
  const totalEarnings = roundMoney(
    washerStats.reduce((sum, washer) => sum + washer.total_earnings, 0),
  );
  return {
    total_jobs: jobs.length,
    total_earnings: totalEarnings,
    washer_commission: roundMoney(totalEarnings * 0.4),
    business_commission: roundMoney(totalEarnings * 0.6),
    by_washer: washerStats,
  };
}
