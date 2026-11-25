const tokenKeys = ["qr_token", "qrToken", "washer_token", "washerToken", "token"];

function normalizeToken(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const token = value.trim();
  return token && !/\s/.test(token) ? token : null;
}

function findTokenInJson(value: unknown): string | null {
  if (typeof value === "string") return normalizeToken(value);
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;

  const record = value as Record<string, unknown>;
  for (const key of tokenKeys) {
    const token = normalizeToken(record[key]);
    if (token) return token;
  }
  for (const key of ["data", "washer", "payload"]) {
    const token = findTokenInJson(record[key]);
    if (token) return token;
  }
  return null;
}

export function extractWasherQrToken(rawValue: string): string | null {
  const value = rawValue.trim();
  if (!value) return null;

  if (value.startsWith("{")) {
    try {
      return findTokenInJson(JSON.parse(value) as unknown);
    } catch {
      return null;
    }
  }

  if (/^https?:\/\//i.test(value)) {
    try {
      const url = new URL(value);
      for (const key of tokenKeys) {
        const token = normalizeToken(url.searchParams.get(key));
        if (token) return token;
      }
      const pathToken = decodeURIComponent(url.pathname.split("/").filter(Boolean).pop() ?? "");
      return normalizeToken(pathToken);
    } catch {
      return null;
    }
  }

  return normalizeToken(value);
}
