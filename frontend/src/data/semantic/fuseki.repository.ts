import { supabase } from "@/infrastructure/supabase/client";
import {
  mapWashJobToSparqlUpdate,
  type WashJobRdfInput,
} from "@/domain/semantic/wash-job-rdf.mapper";
import type {
  SparqlBinding,
  SparqlSelectResults,
} from "@/domain/semantic/sparql-results";

interface FusekiProxyRequest {
  action: "health" | "query" | "update";
  query?: string;
  update?: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

async function getInvocationErrorMessage(error: unknown): Promise<string> {
  if (!(error instanceof Error)) return "Unknown error invoking the Fuseki proxy.";

  if ("context" in error) {
    const context: unknown = error.context;
    if (context instanceof Error) return context.message;
    if (context instanceof Response) {
      const body = await context.clone().text();
      if (body.trim()) {
        try {
          const payload: unknown = JSON.parse(body);
          if (isRecord(payload) && typeof payload.error === "string") {
            return `HTTP ${context.status}: ${payload.error}`;
          }
        } catch {
          return `HTTP ${context.status}: ${body}`;
        }
        return `HTTP ${context.status}: ${body}`;
      }
      return `HTTP ${context.status}: ${error.message}`;
    }
  }

  return error.message;
}

async function invokeFusekiProxy<T>(request: FusekiProxyRequest): Promise<T> {
  const { data, error } = await supabase.functions.invoke<T>("fuseki-proxy", {
    body: request,
  });
  if (error) throw new Error(await getInvocationErrorMessage(error));
  if (data === null) throw new Error("Fuseki proxy returned an empty response.");
  return data;
}

function parseSelectResults(value: unknown): SparqlSelectResults {
  if (!isRecord(value)
    || !isRecord(value.head)
    || !Array.isArray(value.head.vars)
    || !isRecord(value.results)
    || !Array.isArray(value.results.bindings)) {
    throw new Error("Fuseki returned an invalid SPARQL results document.");
  }

  const variables: string[] = value.head.vars.map((variable: unknown) => {
    if (typeof variable !== "string") {
      throw new Error("Fuseki returned an invalid SPARQL variable list.");
    }
    return variable;
  });
  const bindings: SparqlBinding[] = value.results.bindings.map((row: unknown) => {
    if (!isRecord(row)) throw new Error("Fuseki returned an invalid SPARQL result row.");
    const parsedRow: SparqlBinding = {};
    for (const [variable, binding] of Object.entries(row)) {
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

  return {
    head: { vars: variables },
    results: { bindings },
  };
}

export async function syncWashJobToFuseki(washJob: WashJobRdfInput): Promise<void> {
  const update = mapWashJobToSparqlUpdate(washJob);
  await invokeFusekiProxy({ action: "update", update });
}

export async function runSparqlQuery(query: string): Promise<SparqlSelectResults> {
  if (!query.trim()) throw new Error("Enter a SPARQL query.");

  const results = await invokeFusekiProxy<unknown>({ action: "query", query });
  return parseSelectResults(results);
}

export async function checkFusekiHealth(): Promise<boolean> {
  const result = await invokeFusekiProxy<unknown>({ action: "health" });
  if (!isRecord(result) || typeof result.connected !== "boolean") {
    throw new Error("Fuseki proxy returned an invalid health response.");
  }
  return result.connected;
}
