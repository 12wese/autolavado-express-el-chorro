import { describe, expect, it } from "vitest";
import {
  canAdvanceWashJob,
  canManageBusiness,
  canManageConfiguration,
  canViewWashJob,
} from "./business-permissions.rules";

describe("business permissions", () => {
  it("allows administrators to manage business resources", () => {
    expect(canManageBusiness("admin")).toBe(true);
    expect(canManageConfiguration("admin")).toBe(true);
    expect(canViewWashJob("admin", "business-1", "business-1", null, null)).toBe(true);
    expect(canViewWashJob("admin", "business-1", "business-2", null, null)).toBe(false);
  });

  it("limits washers to viewing and advancing their assigned jobs", () => {
    expect(canManageBusiness("washer")).toBe(false);
    expect(canManageConfiguration("washer")).toBe(false);
    expect(canViewWashJob("washer", "business-1", "business-1", "washer-1", "washer-1")).toBe(true);
    expect(canAdvanceWashJob("washer", "business-1", "business-1", "washer-1", "washer-1")).toBe(true);
    expect(canViewWashJob("washer", "business-1", "business-1", "washer-1", "washer-2")).toBe(false);
    expect(canAdvanceWashJob("washer", "business-1", "business-1", "washer-1", "washer-2")).toBe(false);
    expect(canViewWashJob("washer", "business-1", "business-2", "washer-1", "washer-1")).toBe(false);
    expect(canViewWashJob("washer", "business-1", "business-1", null, null)).toBe(false);
  });
});
