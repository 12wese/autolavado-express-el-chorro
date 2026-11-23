const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": [
    "authorization",
    "apikey",
    "content-type",
    "x-client-info",
    "x-supabase-api-version",
    "x-supabase-client-platform",
    "x-supabase-client-version",
    "x-supabase-client-runtime",
    "x-supabase-client-runtime-version",
  ].join(", "),
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

interface FusekiProxyRequest {
  action: "health" | "query" | "update";
  query?: string;
  update?: string;
}

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" },
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseProxyRequest(value: unknown): FusekiProxyRequest | null {
  if (!isRecord(value)) return null;
  if (value.action === "health") return { action: "health" };
  if (value.action === "query" && typeof value.query === "string" && value.query.trim()) {
    return { action: "query", query: value.query };
  }
  if (value.action === "update" && typeof value.update === "string" && value.update.trim()) {
    return { action: "update", update: value.update };
  }
  return null;
}

Deno.serve(async (request: Request): Promise<Response> => {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed." }, 405);
  }

  try {
    let payload: unknown;
    try {
      payload = await request.json();
    } catch {
      return jsonResponse({ error: "Request body must be valid JSON." }, 400);
    }
    const proxyRequest = parseProxyRequest(payload);
    if (!proxyRequest) {
      return jsonResponse({ error: "A valid health, query, or update action is required." }, 400);
    }

    const endpoint = (
      Deno.env.get("FUSEKI_ENDPOINT")
      ?? "http://host.docker.internal:3030/Autolavado"
    ).trim().replace(/\/+$/, "");
    if (!endpoint) {
      return jsonResponse({ error: "FUSEKI_ENDPOINT is empty." }, 500);
    }

    const action = proxyRequest.action;
    const sparql = action === "health" ? "ASK {}"
      : action === "query" ? proxyRequest.query
        : proxyRequest.update;
    if (!sparql) {
      return jsonResponse({ error: "SPARQL query or update is required." }, 400);
    }

    const response = await fetch(
      `${endpoint}/${action === "update" ? "update" : "query"}`,
      {
        method: "POST",
        headers: {
          "Content-Type": action === "update"
            ? "application/sparql-update"
            : "application/sparql-query",
          Accept: "application/sparql-results+json",
        },
        body: sparql,
      },
    );
    if (!response.ok) {
      const detail = (await response.text()).slice(0, 1000);
      return jsonResponse({
        error: `Fuseki returned HTTP ${response.status}${detail ? `: ${detail}` : "."}`,
      }, 502);
    }

    if (action === "update") return jsonResponse({ ok: true }, 200);

    const result: unknown = await response.json();
    if (action === "health") {
      if (!isRecord(result) || typeof result.boolean !== "boolean") {
        return jsonResponse({ error: "Fuseki returned an invalid health response." }, 502);
      }
      return jsonResponse({ connected: result.boolean }, 200);
    }
    return jsonResponse(result, 200);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown Fuseki proxy error.";
    return jsonResponse({ error: `Fuseki proxy request failed: ${message}` }, 502);
  }
});
