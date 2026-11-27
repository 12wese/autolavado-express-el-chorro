import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { getSessionMock, refreshSessionMock } = vi.hoisted(() => ({
  getSessionMock: vi.fn(),
  refreshSessionMock: vi.fn(),
}));

vi.mock("@/infrastructure/supabase/client", () => ({
  supabase: {
    auth: {
      getSession: getSessionMock,
      refreshSession: refreshSessionMock,
    },
  },
}));

import { apiClient } from "./apiClient";

describe("apiClient authentication", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    getSessionMock.mockReset();
    refreshSessionMock.mockReset();
    fetchMock.mockReset().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("uses the current session access token as the Bearer token", async () => {
    getSessionMock.mockResolvedValue({
      data: { session: { access_token: "user-access-token" } },
      error: null,
    });

    await apiClient.get("/api/business/current");

    const [, options] = fetchMock.mock.calls[0];
    expect(new Headers(options.headers).get("Authorization"))
      .toBe("Bearer user-access-token");
    expect(refreshSessionMock).not.toHaveBeenCalled();
  });

  it("refreshes a missing session before sending the request", async () => {
    getSessionMock.mockResolvedValue({
      data: { session: null },
      error: null,
    });
    refreshSessionMock.mockResolvedValue({
      data: { session: { access_token: "refreshed-user-access-token" } },
      error: null,
    });

    await apiClient.get("/api/business/current");

    const [, options] = fetchMock.mock.calls[0];
    expect(new Headers(options.headers).get("Authorization"))
      .toBe("Bearer refreshed-user-access-token");
    expect(refreshSessionMock).toHaveBeenCalledOnce();
  });

  it("does not make the API request without an access token", async () => {
    getSessionMock.mockResolvedValue({
      data: { session: null },
      error: null,
    });
    refreshSessionMock.mockResolvedValue({
      data: { session: null },
      error: null,
    });

    await expect(apiClient.get("/api/business/current"))
      .rejects.toThrow("Inicia sesión para continuar.");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
