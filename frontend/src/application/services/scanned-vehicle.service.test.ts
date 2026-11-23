import { beforeEach, describe, expect, it, vi } from "vitest";
import type { VehicleWashHistory } from "@/domain/entities/vehicle-wash-history.entity";

const { fetchRecentWashJobsByPlate, recognizePlateFromImage } = vi.hoisted(() => ({
  fetchRecentWashJobsByPlate: vi.fn(),
  recognizePlateFromImage: vi.fn(),
}));

vi.mock("@/data/repositories/wash-jobs.repository", () => ({
  fetchRecentWashJobsByPlate,
}));
vi.mock("@/data/repositories/plate-recognition.repository", () => ({
  recognizePlateFromImage,
}));

import {
  getScannedVehicleDefaults,
  lookupScannedVehicle,
  recognizeScannedVehicle,
} from "./scanned-vehicle.service";

const previousJob: VehicleWashHistory = {
  id: "job-id",
  license_plate: "ABC-123",
  car_type: "Moto",
  wash_type: "Lavada",
  status: "completed",
  created_at: "2026-11-20T10:00:00.000Z",
  price: 18000,
};

describe("lookupScannedVehicle", () => {
  beforeEach(() => {
    fetchRecentWashJobsByPlate.mockReset();
    fetchRecentWashJobsByPlate.mockResolvedValue([previousJob]);
    recognizePlateFromImage.mockReset();
  });

  it("loads business-scoped history and prefills the last known vehicle type", async () => {
    const vehicle = await lookupScannedVehicle("abc 123", "business-id");

    expect(fetchRecentWashJobsByPlate).toHaveBeenCalledWith("business-id", "ABC123");
    expect(vehicle).toEqual({
      plate: "ABC123",
      vehicleType: "Moto",
      history: [previousJob],
    });
  });

  describe("getScannedVehicleDefaults", () => {
    it("uses the base vehicle and wash types when the plate has no history", () => {
      expect(
        getScannedVehicleDefaults({
          plate: "ABC123",
          vehicleType: null,
          history: [],
        }),
      ).toEqual({ carType: "Automóvil", washType: "Lavada General" });
    });

    it("prefills the most recent known vehicle and wash types", () => {
      expect(
        getScannedVehicleDefaults({
          plate: "ABC123",
          vehicleType: "Moto",
          history: [previousJob],
        }),
      ).toEqual({ carType: "Moto", washType: "Lavada" });
    });
  });

  it("prefers the explicit type supplied in the QR over previous history", async () => {
    const vehicle = await lookupScannedVehicle(
      '{"plate":"ABC123","vehicleType":"carro"}',
      "business-id",
    );

    expect(vehicle.vehicleType).toBe("Automóvil");
    expect(vehicle.history).toEqual([previousJob]);
  });

  it("uses the AI result, then loads plate history scoped to the current business", async () => {
    recognizePlateFromImage.mockResolvedValue({
      plate: "ABC123",
      vehicleType: null,
      confidence: 0.95,
      rawText: "ABC 123",
    });

    const result = await recognizeScannedVehicle("jpeg-base64", "business-id");

    expect(recognizePlateFromImage).toHaveBeenCalledWith("jpeg-base64");
    expect(fetchRecentWashJobsByPlate).toHaveBeenCalledWith("business-id", "ABC123");
    expect(result.recognition.vehicleType).toBe("automovil");
    expect(result.vehicle).toMatchObject({
      plate: "ABC123",
      vehicleType: "Automóvil",
      history: [previousJob],
    });
  });

  it("does not query history when no plate was recognized", async () => {
    recognizePlateFromImage.mockResolvedValue({
      plate: null,
      vehicleType: null,
      confidence: 0.1,
      rawText: "",
    });

    const result = await recognizeScannedVehicle("jpeg-base64", "business-id");

    expect(result.vehicle).toBeNull();
    expect(fetchRecentWashJobsByPlate).not.toHaveBeenCalled();
  });

  it("does not query history or accept a plate below the high-confidence threshold", async () => {
    recognizePlateFromImage.mockResolvedValue({
      plate: "ABC123",
      vehicleType: "automovil",
      confidence: 0.79,
      rawText: "ABC123",
    });

    const result = await recognizeScannedVehicle("jpeg-base64", "business-id");

    expect(result.vehicle).toBeNull();
    expect(fetchRecentWashJobsByPlate).not.toHaveBeenCalled();
  });

  it("accepts a plate at the high-confidence threshold", async () => {
    recognizePlateFromImage.mockResolvedValue({
      plate: "ABC123",
      vehicleType: "automovil",
      confidence: 0.8,
      rawText: "ABC123",
    });

    const result = await recognizeScannedVehicle("jpeg-base64", "business-id");

    expect(result.vehicle?.plate).toBe("ABC123");
    expect(fetchRecentWashJobsByPlate).toHaveBeenCalledWith("business-id", "ABC123");
  });
});
