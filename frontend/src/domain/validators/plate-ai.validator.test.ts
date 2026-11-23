import { describe, expect, it } from "vitest";
import { parsePlateAiResponse } from "./plate-ai.validator";

const response = {
  plate: " abc-123 ",
  vehicleType: null,
  confidence: 0.92,
  rawText: "ABC 123",
};

describe("parsePlateAiResponse", () => {
  it("normalizes a car plate and infers the vehicle type", () => {
    expect(parsePlateAiResponse(response)).toEqual({
      ...response,
      plate: "ABC123",
      vehicleType: "automovil",
    });
  });

  it("infers motorcycle types for both Colombian motorcycle formats", () => {
    expect(parsePlateAiResponse({ ...response, plate: "abc 12d" }).vehicleType).toBe("moto");
    expect(parsePlateAiResponse({ ...response, plate: "123 abc" }).vehicleType).toBe("moto");
  });

  it("allows unreadable plates and rejects malformed or contradictory results", () => {
    expect(parsePlateAiResponse({ ...response, plate: null }).plate).toBeNull();
    expect(() =>
      parsePlateAiResponse({ ...response, plate: null, vehicleType: "moto" }),
    ).toThrow(/debe ser null/);
    expect(() => parsePlateAiResponse({ ...response, plate: "AB123" })).toThrow();
    expect(() =>
      parsePlateAiResponse({ ...response, vehicleType: "moto" }),
    ).toThrow(/no coincide/);
    expect(() => parsePlateAiResponse({ ...response, confidence: 1.1 })).toThrow();
  });
});
