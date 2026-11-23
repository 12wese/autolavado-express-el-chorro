import { describe, expect, it } from "vitest";
import { extractColombianPlateCandidate, parseVehicleQrValue } from "./vehicle-qr.validator";

describe("parseVehicleQrValue", () => {
  it("normalizes a plain-text plate", () => {
    expect(parseVehicleQrValue(" ab c-123 ")).toEqual({
      plate: "ABC123",
      vehicleType: null,
    });
  });

  describe("extractColombianPlateCandidate", () => {
    it("extracts and normalizes car and motorcycle plates from OCR text", () => {
      expect(extractColombianPlateCandidate("PLACA: abc 123")).toBe("ABC123");
      expect(extractColombianPlateCandidate("MOTO ABC-12D")).toBe("ABC12D");
    });

    it("rejects text that does not contain a Colombian plate pattern", () => {
      expect(extractColombianPlateCandidate("AUTOMOVIL 123 ABC")).toBeNull();
      expect(extractColombianPlateCandidate("XYZ1234")).toBeNull();
    });
  });

  it("reads a plate and maps the vehicle type from JSON", () => {
    expect(parseVehicleQrValue('{"plate":"abc-123","vehicleType":"carro"}')).toEqual({
      plate: "ABC123",
      vehicleType: "Automóvil",
    });
  });

  it("reads a plate and vehicle type from a URL query", () => {
    expect(
      parseVehicleQrValue("https://example.test/vehicle?plate=XYZ-789&vehicleType=moto"),
    ).toEqual({ plate: "XYZ789", vehicleType: "Moto" });
  });

  it("accepts a plate in the last URL path segment", () => {
    expect(parseVehicleQrValue("https://example.test/vehicle/XYZ-789")).toEqual({
      plate: "XYZ789",
      vehicleType: null,
    });
  });

  it("rejects malformed or invalid plates", () => {
    expect(() => parseVehicleQrValue("AB-12")).toThrow();
    expect(() => parseVehicleQrValue('{"plate":"ABC123"}')).not.toThrow();
  });
});
