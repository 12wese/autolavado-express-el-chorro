import { beforeEach, describe, expect, it, vi } from "vitest";

const { invokeMock } = vi.hoisted(() => ({
  invokeMock: vi.fn(),
}));

vi.mock("@/infrastructure/supabase/client", () => ({
  supabase: { functions: { invoke: invokeMock } },
}));

import {
  checkFusekiHealth,
  runSparqlQuery,
  syncWashJobToFuseki,
} from "./fuseki.repository";

const washJob = {
  id: "job-id",
  plate: "ABC123",
  vehicleType: "Automóvil",
  serviceType: "Lavada General",
  totalPrice: 18000,
  createdAt: "2026-11-20T15:00:00.000Z",
  status: "pending",
};

describe("Fuseki repository proxy", () => {
  beforeEach(() => {
    invokeMock.mockReset();
  });

  it("checks health through the Supabase Edge Function", async () => {
    invokeMock.mockResolvedValue({ data: { connected: true }, error: null });

    await expect(checkFusekiHealth()).resolves.toBe(true);
    expect(invokeMock).toHaveBeenCalledWith("fuseki-proxy", {
      body: { action: "health" },
    });
  });

  it("runs SELECT queries through the proxy and returns parsed bindings", async () => {
    const results = {
      head: { vars: ["plate"] },
      results: { bindings: [{ plate: { type: "literal", value: "ABC123" } }] },
    };
    invokeMock.mockResolvedValue({ data: results, error: null });

    await expect(runSparqlQuery("SELECT ?plate WHERE { ?vehicle ?p ?plate }"))
      .resolves.toEqual(results);
    expect(invokeMock).toHaveBeenCalledWith("fuseki-proxy", {
      body: { action: "query", query: "SELECT ?plate WHERE { ?vehicle ?p ?plate }" },
    });
  });

  it("extracts bindings nested under response.data", async () => {
    const binding = { type: "literal", value: "ABC123" };
    invokeMock.mockResolvedValue({
      data: { data: { head: { vars: ["plate"] }, results: { bindings: [{ plate: binding }] } } },
      error: null,
    });

    await expect(runSparqlQuery("SELECT ?plate WHERE { ?vehicle ?p ?plate }"))
      .resolves.toMatchObject({
        head: { vars: ["plate"] },
        results: { bindings: [{ plate: binding }] },
      });
  });

  it("accepts a direct array of result bindings", async () => {
    invokeMock.mockResolvedValue({
      data: [{ plate: "ABC123", serviceType: "Lavada" }],
      error: null,
    });

    await expect(runSparqlQuery("SELECT ?plate WHERE { ?vehicle ?p ?plate }"))
      .resolves.toMatchObject({
        head: { vars: ["plate", "serviceType"] },
        results: {
          bindings: [{
            plate: { type: "literal", value: "ABC123" },
            serviceType: { type: "literal", value: "Lavada" },
          }],
        },
      });
  });

  it("sends the mapped wash job as an update through the proxy", async () => {
    invokeMock.mockResolvedValue({ data: { ok: true }, error: null });

    await syncWashJobToFuseki(washJob);

    expect(invokeMock).toHaveBeenCalledWith("fuseki-proxy", {
      body: expect.objectContaining({
        action: "update",
        update: expect.stringContaining("INSERT DATA"),
      }),
    });
  });

  it("preserves the proxy HTTP error details", async () => {
    const context = new Response(JSON.stringify({ error: "Fuseki returned HTTP 503." }), {
      status: 502,
    });
    const error = Object.assign(new Error("Edge Function returned a non-2xx status code"), {
      context,
    });
    invokeMock.mockResolvedValue({ data: null, error });

    await expect(checkFusekiHealth())
      .rejects.toThrow("HTTP 502: Fuseki returned HTTP 503.");
  });
});
