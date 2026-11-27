import { beforeEach, describe, expect, it, vi } from "vitest";

const { getMock, postMock } = vi.hoisted(() => ({
  getMock: vi.fn(),
  postMock: vi.fn(),
}));

vi.mock("@/infrastructure/api/apiClient", () => ({
  apiClient: { get: getMock, post: postMock },
}));

import {
  checkFusekiHealth,
  runSparqlQuery,
  syncWashJobToFuseki,
} from "./fuseki.repository";

const businessId = "business-id";
const selectQuery = "SELECT ?plate WHERE { ?vehicle ?p ?plate }";
const washJob = {
  id: "job-id",
  plate: "ABC123",
  vehicleType: "Automóvil",
  serviceType: "Lavada General",
  totalPrice: 18000,
  createdAt: "2026-11-20T15:00:00.000Z",
  status: "pending",
};

describe("Fuseki API repository", () => {
  beforeEach(() => {
    getMock.mockReset();
    postMock.mockReset();
  });

  it("checks Fuseki health through the API", async () => {
    getMock.mockResolvedValue({ connected: true });

    await expect(checkFusekiHealth(businessId)).resolves.toBe(true);
    expect(getMock).toHaveBeenCalledWith("/api/semantic/health", { businessId });
  });

  it("runs SELECT queries and returns parsed bindings", async () => {
    const results = {
      head: { vars: ["plate"] },
      results: { bindings: [{ plate: { type: "literal", value: "ABC123" } }] },
    };
    postMock.mockResolvedValue(results);

    await expect(runSparqlQuery(selectQuery, businessId)).resolves.toEqual(results);
    expect(postMock).toHaveBeenCalledWith(
      "/api/semantic/query",
      { query: selectQuery },
      { businessId },
    );
  });

  it("extracts bindings nested under response.data", async () => {
    const binding = { type: "literal", value: "ABC123" };
    postMock.mockResolvedValue({
      data: { head: { vars: ["plate"] }, results: { bindings: [{ plate: binding }] } },
    });

    await expect(runSparqlQuery(selectQuery, businessId)).resolves.toMatchObject({
      head: { vars: ["plate"] },
      results: { bindings: [{ plate: binding }] },
    });
  });

  it("accepts a direct array of result bindings", async () => {
    postMock.mockResolvedValue([{ plate: "ABC123", serviceType: "Lavada" }]);

    await expect(runSparqlQuery(selectQuery, businessId)).resolves.toMatchObject({
      head: { vars: ["plate", "serviceType"] },
      results: {
        bindings: [{
          plate: { type: "literal", value: "ABC123" },
          serviceType: { type: "literal", value: "Lavada" },
        }],
      },
    });
  });

  it("sends mapped wash-job updates with the business context", async () => {
    postMock.mockResolvedValue({ ok: true });

    await syncWashJobToFuseki(washJob, businessId);

    expect(postMock).toHaveBeenCalledWith(
      "/api/semantic/update",
      { update: expect.stringContaining("INSERT DATA") },
      { businessId },
    );
  });

  it("preserves API errors", async () => {
    const error = new Error("Fuseki returned HTTP 503. (HTTP 502)");
    getMock.mockRejectedValue(error);

    await expect(checkFusekiHealth(businessId)).rejects.toBe(error);
  });
});
