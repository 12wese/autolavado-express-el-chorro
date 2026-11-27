import { beforeEach, describe, expect, it, vi } from "vitest";

const { postMock } = vi.hoisted(() => ({ postMock: vi.fn() }));

vi.mock("@/infrastructure/api/apiClient", () => ({
  apiClient: { post: postMock },
}));

import { recognizePlateFromImage } from "./plate-recognition.repository";

describe("recognizePlateFromImage", () => {
  beforeEach(() => {
    postMock.mockReset();
  });

  it("posts the image to the authenticated API", async () => {
    const result = { plate: "ABC123", vehicleType: "automovil", confidence: 0.96, rawText: "ABC123" };
    postMock.mockResolvedValue(result);

    await expect(recognizePlateFromImage("encoded-jpeg")).resolves.toEqual(result);
    expect(postMock).toHaveBeenCalledWith(
      "/api/vision/recognize-plate",
      { imageBase64: "encoded-jpeg" },
    );
  });

  it("surfaces API failures", async () => {
    const error = new Error("Vision API unavailable");
    postMock.mockRejectedValue(error);

    await expect(recognizePlateFromImage("encoded-jpeg")).rejects.toBe(error);
  });
});
