import { describe, expect, it } from "vitest";
import { emailSchema, passwordSchema } from "./auth.validator";
import {
  newAddonSchema,
  newWasherSchema,
  quickWashJobSchema,
  servicePriceSchema,
} from "./quick-wash-job.validator";

describe("quickWashJobSchema", () => {
  it("normalizes the plate and defaults addons to an empty list", () => {
    const result = quickWashJobSchema.parse({
      carType: "Sedán",
      washType: "Completo",
      licensePlate: " ABC-123 ",
      washerId: null,
    });

    expect(result.licensePlate).toBe("ABC123");
    expect(result.addonIds).toEqual([]);
  });

  it("rejects missing vehicle data and duplicated addon IDs", () => {
    const validForm = {
      carType: "Sedán",
      washType: "Completo",
      licensePlate: "ABC-123",
      washerId: null,
    };
    const addonId = "550e8400-e29b-41d4-a716-446655440000";

    expect(quickWashJobSchema.safeParse({ ...validForm, carType: "" }).success).toBe(false);
    expect(
      quickWashJobSchema.safeParse({ ...validForm, addonIds: [addonId, addonId] }).success,
    ).toBe(false);
  });
});

describe("catalog validators", () => {
  it("trims addon names and rejects negative prices", () => {
    expect(newAddonSchema.parse({ name: "  Cera  ", price: 5 }).name).toBe("Cera");
    expect(newAddonSchema.safeParse({ name: "Cera", price: -1 }).success).toBe(false);
  });

  it("requires a valid washer name and email", () => {
    expect(newWasherSchema.safeParse({ name: "Ana", email: "ana@example.com" }).success).toBe(true);
    expect(newWasherSchema.safeParse({ name: " ", email: "ana@example.com" }).success).toBe(false);
    expect(newWasherSchema.safeParse({ name: "Ana", email: "bad-email" }).success).toBe(false);
  });

  it("rejects service prices below zero", () => {
    expect(
      servicePriceSchema.safeParse({ car_type: "Sedán", wash_type: "Completo", price: 20 }).success,
    ).toBe(true);
    expect(
      servicePriceSchema.safeParse({ car_type: "Sedán", wash_type: "Completo", price: -1 }).success,
    ).toBe(false);
  });
});

describe("auth validators", () => {
  it("accepts well-formed email and minimum-length password values", () => {
    expect(emailSchema.safeParse("user@example.com").success).toBe(true);
    expect(passwordSchema.safeParse("secret").success).toBe(true);
    expect(emailSchema.safeParse("invalid").success).toBe(false);
    expect(passwordSchema.safeParse("short").success).toBe(false);
  });
});
