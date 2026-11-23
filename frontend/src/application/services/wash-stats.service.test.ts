import { describe, expect, it } from "vitest";
import type { WashJob } from "@/domain/entities/wash-job.entity";
import {
  businessEarnings,
  summarizeByWasher,
  washerEarnings,
} from "./wash-stats.service";

function job(id: string, washerName: string, price: number): WashJob {
  return {
    id,
    user_id: "user-1",
    created_by_user_id: "user-1",
    business_id: "business-1",
    washer_id: null,
    car_type: "Sedán",
    wash_type: "Completo",
    washer_name: washerName,
    license_plate: `ABC-${id}`,
    price,
    status: "pending",
    created_at: "2026-11-17T10:00:00.000Z",
    updated_at: "2026-11-17T10:00:00.000Z",
    addons: [],
  };
}

describe("wash earnings split", () => {
  it("allocates 60% to the business and 40% to the washer", () => {
    const total = 250;

    expect(businessEarnings(total)).toBe(150);
    expect(washerEarnings(total)).toBe(100);
    expect(businessEarnings(total) + washerEarnings(total)).toBe(total);
  });
});

describe("summarizeByWasher", () => {
  it("groups jobs by washer and totals count and earnings", () => {
    const summaries = summarizeByWasher([
      job("1", "Ana", 100),
      job("2", "Luis", 80),
      job("3", "Ana", 120),
      job("4", "Luis", 0),
    ]);

    expect(summaries).toEqual([
      { washer_name: "Ana", total_jobs: 2, total_earnings: 220 },
      { washer_name: "Luis", total_jobs: 2, total_earnings: 80 },
    ]);
  });

  it("returns an empty result when there are no jobs", () => {
    expect(summarizeByWasher([])).toEqual([]);
  });
});
