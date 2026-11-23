import { describe, expect, it } from "vitest";
import type { Addon } from "@/domain/entities/addon.entity";
import type { ServicePrice } from "@/domain/entities/service-price.entity";
import {
  calculateServicePrice,
  calculateServicePriceBreakdown,
  calculateTotalPrice,
  findBasePrice,
} from "./pricing.rules";

function addon(id: string, price: number): Addon {
  return {
    id,
    user_id: "user-id",
    created_by_user_id: "user-id",
    business_id: "business-id",
    name: `Addon ${id}`,
    price,
    created_at: "2026-01-01T00:00:00.000Z",
  };
}

function servicePrice(carType: string, washType: string, price: number): ServicePrice {
  return {
    id: `${carType}-${washType}`,
    user_id: "user-id",
    created_by_user_id: "user-id",
    business_id: "business-id",
    car_type: carType,
    wash_type: washType,
    price,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
  };
}

describe("findBasePrice", () => {
  it("returns the configured price for an exact vehicle and wash combination", () => {
    expect(findBasePrice([servicePrice("Sedán", "Completo", 35)], "Sedán", "Completo")).toBe(35);
  });

  it("returns null when the combination is not configured", () => {
    expect(findBasePrice([servicePrice("Sedán", "Completo", 35)], "SUV", "Completo")).toBeNull();
  });
});

describe("calculateTotalPrice", () => {
  it("adds the base price and selected addons in cents", () => {
    expect(calculateTotalPrice(100.1, [addon("a", 2.35), addon("b", 0.25)])).toBe(102.7);
  });

  it("avoids floating point artifacts and supports an empty addon selection", () => {
    expect(calculateTotalPrice(0.1, [addon("a", 0.2)])).toBe(0.3);
    expect(calculateTotalPrice(12.345, [])).toBe(12.35);
  });
});

describe("calculateServicePrice", () => {
  it("calculates the configured fare and only the selected addons", () => {
    const prices = [
      servicePrice("Automóvil", "Lavada General", 15000),
      servicePrice("Moto", "Lavada", 8000),
    ];
    const addons = [addon("wax", 2500), addon("degreaser", 4000)];

    expect(
      calculateServicePrice(prices, addons, "Moto", "Lavada", ["wax"]),
    ).toBe(10500);
  });

  it("returns null if the business has no matching tariff", () => {
    expect(calculateServicePrice([], [], "Moto", "Lavada", [])).toBeNull();
  });

  it("returns the configured base price with no extras and itemizes selected extras", () => {
    const prices = [servicePrice("Automóvil", "Lavada General", 15000)];
    const addons = [addon("wax", 2500), addon("degreaser", 4000)];

    expect(
      calculateServicePriceBreakdown(prices, addons, "Automóvil", "Lavada General", []),
    ).toEqual({ basePrice: 15000, addons: [], totalPrice: 15000 });
    expect(
      calculateServicePriceBreakdown(prices, addons, "Automóvil", "Lavada General", ["wax"]),
    ).toEqual({ basePrice: 15000, addons: [addons[0]], totalPrice: 17500 });
  });
});
