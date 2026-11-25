import { describe, expect, it } from "vitest";
import { extractWasherQrToken } from "./washer-qr-token.validator";

describe("extractWasherQrToken", () => {
  it("accepts a direct token", () => {
    expect(extractWasherQrToken(" a1b2c3d4e5f6 ")).toBe("a1b2c3d4e5f6");
  });

  it("extracts a token from URLs and JSON payloads", () => {
    expect(extractWasherQrToken("https://example.test/washer?qr_token=abc123"))
      .toBe("abc123");
    expect(extractWasherQrToken('{"data":{"qr_token":"abc123"}}')).toBe("abc123");
    expect(extractWasherQrToken("https://example.test/washer/abc123")).toBe("abc123");
  });

  it("rejects empty or malformed values", () => {
    expect(extractWasherQrToken("")).toBeNull();
    expect(extractWasherQrToken('{"token":')).toBeNull();
    expect(extractWasherQrToken("token with spaces")).toBeNull();
  });
});
