import { beforeEach, describe, expect, it, vi } from "vitest";

const { invokeMock } = vi.hoisted(() => ({ invokeMock: vi.fn() }));

vi.mock("@/infrastructure/supabase/client", () => ({
  supabase: { functions: { invoke: invokeMock } },
}));

import { recognizePlateFromImage } from "./plate-recognition.repository";

describe("recognizePlateFromImage", () => {
  beforeEach(() => {
    invokeMock.mockReset();
  });

  it("invokes the authenticated Edge Function and returns its response", async () => {
    const result = { plate: "ABC123", vehicleType: "automovil", confidence: 0.96, rawText: "ABC123" };
    invokeMock.mockResolvedValue({ data: result, error: null });

    await expect(recognizePlateFromImage("encoded-jpeg")).resolves.toEqual(result);
    expect(invokeMock).toHaveBeenCalledWith("recognize-plate", {
      body: { imageBase64: "encoded-jpeg" },
    });
  });

  it("surfaces Edge Function invocation failures", async () => {
    const error = new Error("Function invocation failed");
    invokeMock.mockResolvedValue({ data: null, error });

    await expect(recognizePlateFromImage("encoded-jpeg")).rejects.toBe(error);
  });
});
