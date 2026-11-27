import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NewWashJobInput } from "@/domain/entities/wash-job.entity";

const { getMock, postMock } = vi.hoisted(() => ({
  getMock: vi.fn(),
  postMock: vi.fn(),
}));

vi.mock("@/infrastructure/api/apiClient", () => ({
  apiClient: { get: getMock, post: postMock },
}));

import {
  createWashJob,
  createWashJobAndFetchReceipt,
  fetchRecentWashJobsByPlate,
  fetchWashStats,
} from "./wash-jobs.repository";

const createdJob = {
  id: "wash-job-id",
  business_id: "business-id",
  license_plate: "ABC123",
  addons: [],
};

describe("wash jobs API repository", () => {
  beforeEach(() => {
    getMock.mockReset();
    postMock.mockReset();
  });

  it("requests recent washes with a normalized plate and business context", async () => {
    getMock.mockResolvedValue([createdJob]);

    await expect(fetchRecentWashJobsByPlate("business-id", "abc-123"))
      .resolves.toEqual([createdJob]);
    expect(getMock).toHaveBeenCalledWith(
      "/api/washes",
      expect.objectContaining({
        businessId: "business-id",
        query: expect.any(URLSearchParams),
      }),
    );
    const query = getMock.mock.calls[0][1].query as URLSearchParams;
    expect(query.get("plate")).toBe("ABC123");
  });

  it("posts a new job and returns its persisted ID", async () => {
    postMock.mockResolvedValue(createdJob);

    const input: NewWashJobInput = {
      washer_id: null,
      car_type: "Automóvil",
      wash_type: "Lavada General",
      license_plate: "ABC123",
      base_price: 15000,
      addon_ids: [],
    };
    await expect(createWashJob("business-id", input)).resolves.toBe("wash-job-id");
    expect(postMock).toHaveBeenCalledWith("/api/washes", input, { businessId: "business-id" });
  });

  it("returns the job payload from the create endpoint for quick receipts", async () => {
    postMock.mockResolvedValue(createdJob);

    const input: NewWashJobInput = {
      washer_id: null,
      car_type: "Automóvil",
      wash_type: "Lavada General",
      license_plate: "ABC123",
      base_price: 15000,
      addon_ids: [],
    };
    await expect(createWashJobAndFetchReceipt("business-id", input)).resolves.toEqual(createdJob);
  });

  it("requests monthly statistics from the API", async () => {
    getMock.mockResolvedValue({
      total_jobs: 1,
      total_earnings: 15000,
      washer_commission: 6000,
      business_commission: 9000,
      by_washer: [],
    });

    await fetchWashStats("business-id", "2026-11");

    expect(getMock).toHaveBeenCalledWith(
      "/api/washes/stats",
      expect.objectContaining({
        businessId: "business-id",
        query: expect.any(URLSearchParams),
      }),
    );
    expect((getMock.mock.calls[0][1].query as URLSearchParams).get("month")).toBe("2026-11");
  });
});
