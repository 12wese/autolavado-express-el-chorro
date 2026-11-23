import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NewWashJobInput } from "@/domain/entities/wash-job.entity";

const { rpcMock, fromMock, selectMock, eqMock, singleMock, inMock, orderMock } = vi.hoisted(() => ({
  rpcMock: vi.fn(),
  fromMock: vi.fn(),
  selectMock: vi.fn(),
  eqMock: vi.fn(),
  singleMock: vi.fn(),
  inMock: vi.fn(),
  orderMock: vi.fn(),
}));

vi.mock("@/infrastructure/supabase/client", () => ({
  supabase: { rpc: rpcMock, from: fromMock },
}));

import {
  createWashJob,
  createWashJobAndFetchReceipt,
  fetchRecentWashJobsByPlate,
  WashJobReceiptUnavailableError,
} from "./wash-jobs.repository";

describe("fetchRecentWashJobsByPlate", () => {
  beforeEach(() => {
    rpcMock.mockReset();
    rpcMock.mockResolvedValue({ data: [], error: null });
  });

  it("uses the business-scoped RPC with a normalized plate", async () => {
    await fetchRecentWashJobsByPlate("business-id", "abc-123");

    expect(rpcMock).toHaveBeenCalledWith("find_recent_wash_jobs_by_plate", {
      p_business_id: "business-id",
      p_plate: "ABC123",
    });
  });
});

describe("createWashJob", () => {
  beforeEach(() => {
    rpcMock.mockReset();
    rpcMock.mockResolvedValue({ data: "wash-job-id", error: null });
    fromMock.mockReset();
    selectMock.mockReset().mockReturnThis();
    eqMock.mockReset().mockReturnThis();
    singleMock.mockReset().mockResolvedValue({
      data: {
        id: "wash-job-id",
        user_id: "user-id",
        created_by_user_id: "user-id",
        business_id: "business-id",
        washer_id: "washer-id",
        car_type: "Sedán",
        wash_type: "Completo",
        washer_name: "Carlos",
        license_plate: "ABC-123",
        price: 12,
        status: "pending",
        created_at: "2026-11-20T15:00:00.000Z",
        updated_at: "2026-11-20T15:00:00.000Z",
      },
      error: null,
    });
    inMock.mockReset().mockReturnThis();
    orderMock.mockReset().mockResolvedValue({ data: [], error: null });
    fromMock.mockImplementation(() => ({
      select: selectMock,
      eq: eqMock,
      single: singleMock,
      in: inMock,
      order: orderMock,
    }));
  });

  it("returns the persisted ID for background follow-up", async () => {
    const washJobId = await createWashJob("business-id", {
      washer_id: null,
      car_type: "Automóvil",
      wash_type: "Lavada General",
      license_plate: "ABC123",
      base_price: 15000,
      addon_ids: [],
    });

    expect(washJobId).toBe("wash-job-id");
  });

  it("persists the job and selected addons through the atomic RPC", async () => {
    const input: NewWashJobInput = {
      washer_id: "washer-id",
      car_type: "Sedán",
      wash_type: "Completo",
      license_plate: "ABC-123",
      base_price: 10,
      addon_ids: ["addon-id"],
    };

    const createdJob = await createWashJobAndFetchReceipt("business-id", input);

    expect(rpcMock).toHaveBeenCalledWith("create_wash_job_with_addons", {
      p_business_id: "business-id",
      p_washer_id: "washer-id",
      p_car_type: "Sedán",
      p_wash_type: "Completo",
      p_license_plate: "ABC-123",
      p_base_price: 10,
      p_addon_ids: ["addon-id"],
    });
    expect(createdJob.created_at).toBe("2026-11-20T15:00:00.000Z");
    expect(createdJob.addons).toEqual([]);
    expect(eqMock).toHaveBeenNthCalledWith(1, "business_id", "business-id");
    expect(eqMock).toHaveBeenNthCalledWith(2, "id", "wash-job-id");
  });

  it("distinguishes a persisted job whose receipt could not be fetched", async () => {
    singleMock.mockResolvedValue({ data: null, error: new Error("read failed") });

    const creation = createWashJobAndFetchReceipt("business-id", {
        washer_id: null,
        car_type: "Automóvil",
        wash_type: "Lavada General",
        license_plate: "ABC123",
        base_price: 15000,
        addon_ids: [],
    });
    await expect(creation).rejects.toBeInstanceOf(WashJobReceiptUnavailableError);
    await expect(creation).rejects.toHaveProperty("washJobId", "wash-job-id");
  });

  it("surfaces RPC failures", async () => {
    const error = new Error("RPC failed");
    rpcMock.mockResolvedValue({ data: null, error });

    await expect(
      createWashJob("user-id", {
        washer_id: null,
        car_type: "Sedán",
        wash_type: "Completo",
        license_plate: "ABC-123",
        base_price: 10,
        addon_ids: [],
      }),
    ).rejects.toBe(error);
  });
});
