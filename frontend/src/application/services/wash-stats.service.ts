import { format, parseISO } from "date-fns";
import type { WashJob } from "@/domain/entities/wash-job.entity";
import { BUSINESS_EARNINGS_SHARE, WASHER_EARNINGS_SHARE } from "@/domain/rules/wash-status.rules";

export interface WasherSummary {
  washer_name: string;
  total_jobs: number;
  total_earnings: number;
}

export interface DaySummary {
  date: string;
  jobs: WashJob[];
  totalVehicles: number;
  totalEarnings: number;
  washers: Map<string, { jobs: WashJob[]; earnings: number }>;
}

export function summarizeByWasher(jobs: WashJob[]): WasherSummary[] {
  const summaryMap = new Map<string, WasherSummary>();

  jobs.forEach((job) => {
    const existing = summaryMap.get(job.washer_name);
    if (existing) {
      existing.total_jobs += 1;
      existing.total_earnings += job.price || 0;
    } else {
      summaryMap.set(job.washer_name, {
        washer_name: job.washer_name,
        total_jobs: 1,
        total_earnings: job.price || 0,
      });
    }
  });

  return Array.from(summaryMap.values());
}

export function summarizeByDay(jobs: WashJob[]): DaySummary[] {
  const dayMap = new Map<string, WashJob[]>();
  jobs.forEach((job) => {
    const day = format(parseISO(job.created_at), "yyyy-MM-dd");
    if (!dayMap.has(day)) dayMap.set(day, []);
    dayMap.get(day)!.push(job);
  });

  const summaries: DaySummary[] = [];
  dayMap.forEach((dayJobs, date) => {
    const washers = new Map<string, { jobs: WashJob[]; earnings: number }>();
    dayJobs.forEach((job) => {
      if (!washers.has(job.washer_name)) washers.set(job.washer_name, { jobs: [], earnings: 0 });
      const w = washers.get(job.washer_name)!;
      w.jobs.push(job);
      w.earnings += job.price || 0;
    });

    summaries.push({
      date,
      jobs: dayJobs,
      totalVehicles: dayJobs.length,
      totalEarnings: dayJobs.reduce((sum, job) => sum + (job.price || 0), 0),
      washers,
    });
  });

  return summaries.sort((a, b) => b.date.localeCompare(a.date));
}

export const businessEarnings = (total: number) => total * BUSINESS_EARNINGS_SHARE;
export const washerEarnings = (total: number) => total * WASHER_EARNINGS_SHARE;

export const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(amount);
