import { describe, expect, it } from "vitest";
import { newWashJobSchema } from "./wash-job.validator";

const validWashJob = {
  carType: "Sedán",
  washTypes: ["Completo"],
  washerId: "550e8400-e29b-41d4-a716-446655440000",
  licensePlate: " ABC-123 ",
  basePrice: 25,
  addonIds: [],
};

describe("newWashJobSchema", () => {
  it("accepts a valid job and normalizes its license plate", () => {
    const result = newWashJobSchema.safeParse(validWashJob);

    expect(result.success).toBe(true);
    if (result.success) expect(result.data.licensePlate).toBe("ABC-123");
  });

  it("allows an unassigned washer and rejects invalid required values", () => {
    expect(newWashJobSchema.safeParse({ ...validWashJob, washerId: null }).success).toBe(true);
    expect(newWashJobSchema.safeParse({ ...validWashJob, carType: "" }).success).toBe(false);
    expect(newWashJobSchema.safeParse({ ...validWashJob, washTypes: [] }).success).toBe(false);
    expect(newWashJobSchema.safeParse({ ...validWashJob, washerId: "not-a-uuid" }).success).toBe(false);
    expect(newWashJobSchema.safeParse({ ...validWashJob, basePrice: -1 }).success).toBe(false);
  });

  it("rejects duplicated addon selections", () => {
    const addonId = "550e8400-e29b-41d4-a716-446655440001";
    expect(
      newWashJobSchema.safeParse({ ...validWashJob, addonIds: [addonId, addonId] }).success,
    ).toBe(false);
  });
});
