import { beforeEach, describe, expect, it, vi } from "vitest";

const { fromMock, selectMock, eqMock, maybeSingleMock } = vi.hoisted(() => ({
  fromMock: vi.fn(),
  selectMock: vi.fn(),
  eqMock: vi.fn(),
  maybeSingleMock: vi.fn(),
}));

vi.mock("@/infrastructure/supabase/client", () => ({
  supabase: { from: fromMock },
}));

import { fetchWasherByToken } from "./washers.repository";

describe("fetchWasherByToken", () => {
  beforeEach(() => {
    fromMock.mockReset().mockReturnValue({
      select: selectMock,
    });
    selectMock.mockReset().mockReturnThis();
    eqMock.mockReset().mockReturnThis();
    maybeSingleMock.mockReset().mockResolvedValue({ data: null, error: null });
    selectMock.mockReturnValue({ eq: eqMock });
    eqMock.mockReturnValue({ eq: eqMock, maybeSingle: maybeSingleMock });
  });

  it("finds the QR token only among active washers", async () => {
    await fetchWasherByToken("washer-token");

    expect(fromMock).toHaveBeenCalledWith("washers");
    expect(selectMock).toHaveBeenCalledWith("*");
    expect(eqMock).toHaveBeenNthCalledWith(1, "qr_token", "washer-token");
    expect(eqMock).toHaveBeenNthCalledWith(2, "active", true);
    expect(maybeSingleMock).toHaveBeenCalledOnce();
  });
});
