import { beforeEach, describe, expect, it, vi } from "vitest";

const { getMock } = vi.hoisted(() => ({ getMock: vi.fn() }));

vi.mock("@/infrastructure/api/apiClient", () => ({
  apiClient: { get: getMock },
}));

import { fetchWasherByToken } from "./washers.repository";

describe("fetchWasherByToken", () => {
  beforeEach(() => {
    getMock.mockReset().mockResolvedValue(null);
  });

  it("resolves the QR token through the API", async () => {
    await fetchWasherByToken("washer-token");

    expect(getMock).toHaveBeenCalledWith(
      "/api/washers/by-token/washer-token",
    );
  });

});
