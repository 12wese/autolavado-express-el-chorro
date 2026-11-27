import { apiClient } from "@/infrastructure/api/apiClient";
import {
  mapWashJobToSparqlUpdate,
  type WashJobRdfInput,
} from "@/domain/semantic/wash-job-rdf.mapper";
import type {
  SparqlBinding,
  SparqlSelectResults,
} from "@/domain/semantic/sparql-results";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getBindings(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (!isRecord(value)) {
    throw new Error("Fuseki returned an invalid SPARQL results document.");
  }
  if (isRecord(value.results) && Array.isArray(value.results.bindings)) {
    return value.results.bindings;
  }
  if (isRecord(value.data)
    && isRecord(value.data.results)
    && Array.isArray(value.data.results.bindings)) {
    return value.data.results.bindings;
  }
  if (Array.isArray(value.bindings)) return value.bindings;
  throw new Error("Fuseki response does not contain SPARQL bindings.");
}

function getResponseHead(value: unknown): Record<string, unknown> | null {
  if (!isRecord(value)) return null;
  if (isRecord(value.head)) return value.head;
  if (isRecord(value.data) && isRecord(value.data.head)) return value.data.head;
  return null;
}

function parseSelectResults(value: unknown): SparqlSelectResults {
  const rawBindings = getBindings(value);
  const head = getResponseHead(value);
  const variables = Array.isArray(head?.vars)
    ? head.vars.map((variable: unknown) => {
      if (typeof variable !== "string") {
        throw new Error("Fuseki returned an invalid SPARQL variable list.");
      }
      return variable;
    })
    : [];
  const bindings: SparqlBinding[] = rawBindings.map((row: unknown) => {
    if (!isRecord(row)) throw new Error("Fuseki returned an invalid SPARQL result row.");
    const parsedRow: SparqlBinding = {};
    for (const [variable, binding] of Object.entries(row)) {
      if (typeof binding === "string") {
        parsedRow[variable] = { type: "literal", value: binding };
        continue;
      }
      if (!isRecord(binding) || typeof binding.type !== "string"
        || typeof binding.value !== "string") {
        throw new Error("Fuseki returned an invalid SPARQL binding.");
      }
      parsedRow[variable] = {
        type: binding.type,
        value: binding.value,
        ...(typeof binding.datatype === "string" ? { datatype: binding.datatype } : {}),
        ...(typeof binding["xml:lang"] === "string"
          ? { "xml:lang": binding["xml:lang"] }
          : {}),
      };
    }
    return parsedRow;
  });

  const resolvedVariables = variables.length > 0
    ? variables
    : [...new Set(bindings.flatMap((row) => Object.keys(row)))];
  return {
    head: { vars: resolvedVariables },
    results: { bindings },
  };
}

export async function syncWashJobToFuseki(
  washJob: WashJobRdfInput,
  businessId: string,
): Promise<void> {
  const update = mapWashJobToSparqlUpdate(washJob);
  await apiClient.post("/api/semantic/update", { update }, { businessId });
}

export async function runSparqlQuery(
  query: string,
  businessId: string,
): Promise<SparqlSelectResults> {
  if (!query.trim()) throw new Error("Enter a SPARQL query.");

  const results = await apiClient.post<unknown>(
    "/api/semantic/query",
    { query },
    { businessId },
  );
  return parseSelectResults(results);
}

export async function checkFusekiHealth(businessId: string): Promise<boolean> {
  const result = await apiClient.get<unknown>("/api/semantic/health", { businessId });
  if (!isRecord(result) || typeof result.connected !== "boolean") {
    throw new Error("Fuseki proxy returned an invalid health response.");
  }
  return result.connected;
}
