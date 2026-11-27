import { z } from 'zod';
import type { SupabaseClient } from '@supabase/supabase-js';
import { HttpError } from '../lib/http-error';

const semanticRequestSchema = z.object({
  query: z.string().trim().min(1).max(100_000),
  update: z.string().trim().min(1).max(100_000),
});

export function parseSelectRequest(value: unknown): string {
  return semanticRequestSchema.pick({ query: true }).parse(value).query;
}

export function parseInsertRequest(value: unknown): string {
  return semanticRequestSchema.pick({ update: true }).parse(value).update;
}

function stripPrologue(value: string): string {
  let remaining = value.trim();
  while (true) {
    remaining = remaining.replace(/^(?:#[^\r\n]*(?:\r?\n|$)\s*)+/, '');
    const prologue = remaining.match(/^(?:PREFIX\s+(?:[\w-]+)?:\s*<[^>]+>|BASE\s*<[^>]+>)\s*/i);
    if (!prologue) return remaining.trimStart();
    remaining = remaining.slice(prologue[0].length);
  }
}

function stripCommentsStringsAndIris(value: string): string {
  return value.replace(
    /#[^\r\n]*|"""[\s\S]*?"""|'''[\s\S]*?'''|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|<[^<>\s]*>/g,
    (segment) => segment.replace(/[^\r\n]/g, ' '),
  );
}

function stripCommentsAndStrings(value: string): string {
  return value.replace(
    /<[^<>\s]*>|#[^\r\n]*|"""[\s\S]*?"""|'''[\s\S]*?'''|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'/g,
    (segment) => segment.startsWith('<')
      ? `<${' '.repeat(Math.max(0, segment.length - 2))}>`
      : segment.replace(/[^\r\n]/g, ' '),
  );
}

export function validateSelectQuery(query: string): string {
  const statement = stripPrologue(query);
  if (!/^SELECT\b/i.test(statement)) {
    throw new HttpError(400, 'Only SPARQL SELECT queries are allowed');
  }
  if (hasTopLevelSemicolon(statement)) {
    throw new HttpError(400, 'Only one SPARQL query operation is allowed');
  }

  const executable = stripCommentsAndStrings(statement);
  if (/(?<![?$:])\bSERVICE\s*(?:SILENT\s*)?</i.test(executable)) {
    throw new HttpError(400, 'SPARQL SERVICE clauses are not allowed');
  }

  const destructiveMutations = [
    /(?<![?$:])\b(?:DROP|CLEAR)\s+(?:SILENT\s+)?(?:DEFAULT\b|NAMED\b|ALL\b|GRAPH\b)/i,
    /(?<![?$:])\bLOAD\s+(?:SILENT\s+)?</i,
    /(?<![?$:])\bCREATE\s+(?:SILENT\s+)?GRAPH\b/i,
  ];
  if (destructiveMutations.some((pattern) => pattern.test(executable))) {
    throw new HttpError(400, 'Destructive SPARQL updates are not allowed in query requests');
  }

  return statement;
}

function hasTopLevelSemicolon(value: string): boolean {
  const executable = stripCommentsStringsAndIris(value);
  let braceDepth = 0;
  for (const character of executable) {
    if (character === '{') braceDepth += 1;
    if (character === '}') braceDepth -= 1;
    if (character === ';' && braceDepth === 0) return true;
  }
  return false;
}

function getFusekiEndpoint(): string {
  const configured = process.env.FUSEKI_ENDPOINT?.trim();
  if (!configured) throw new HttpError(503, 'Semantic store is not configured');

  let endpoint: URL;
  try {
    endpoint = new URL(configured);
  } catch {
    throw new HttpError(500, 'FUSEKI_ENDPOINT is invalid');
  }
  if (!['http:', 'https:'].includes(endpoint.protocol)
    || endpoint.username || endpoint.password || endpoint.search || endpoint.hash) {
    throw new HttpError(500, 'FUSEKI_ENDPOINT must be an HTTP(S) dataset URL');
  }
  return endpoint.toString().replace(/\/+$/, '');
}

async function assertBusinessAdmin(client: SupabaseClient, businessId: string) {
  const { data, error } = await client.rpc('is_business_admin', {
    p_business_id: businessId,
  });
  if (error) throw error;
  if (data !== true) throw new HttpError(403, 'Business administrator membership required');
}

async function sendFusekiRequest(url: string, init?: RequestInit): Promise<Response> {
  try {
    return await fetch(url, {
      ...init,
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    throw new HttpError(502, 'Semantic store request failed');
  }
}

async function readFusekiJson(response: Response): Promise<unknown> {
  try {
    return await response.json() as unknown;
  } catch {
    throw new HttpError(502, 'Semantic store returned invalid JSON');
  }
}

export async function checkSemanticHealth(client: SupabaseClient, businessId: string) {
  await assertBusinessAdmin(client, businessId);
  const endpoint = getFusekiEndpoint();
  const query = 'ASK WHERE { ?s ?p ?o }';
  const response = await sendFusekiRequest(
    `${endpoint}/query?query=${encodeURIComponent(query)}`,
    { headers: { Accept: 'application/sparql-results+json' } },
  );
  if (!response.ok) throw new HttpError(502, `Semantic store returned HTTP ${response.status}`);

  const result = await readFusekiJson(response);
  if (!isRecord(result) || typeof result.boolean !== 'boolean') {
    throw new HttpError(502, 'Semantic store returned an invalid health response');
  }
  return { connected: result.boolean };
}

export async function runSelectQuery(
  client: SupabaseClient,
  businessId: string,
  query: string,
) {
  await assertBusinessAdmin(client, businessId);
  validateSelectQuery(query);

  const response = await sendFusekiRequest(
    `${getFusekiEndpoint()}/query?query=${encodeURIComponent(query)}`,
    { headers: { Accept: 'application/sparql-results+json' } },
  );
  if (!response.ok) throw new HttpError(502, `Semantic store returned HTTP ${response.status}`);
  return readFusekiJson(response);
}

export async function runInsertData(
  client: SupabaseClient,
  businessId: string,
  update: string,
) {
  await assertBusinessAdmin(client, businessId);
  const statement = stripPrologue(update);
  if (!/^INSERT\s+DATA\b/i.test(statement)) {
    throw new HttpError(400, 'Only SPARQL INSERT DATA updates are allowed');
  }
  if (hasTopLevelSemicolon(statement)) {
    throw new HttpError(400, 'Only one SPARQL update operation is allowed');
  }

  const response = await sendFusekiRequest(`${getFusekiEndpoint()}/update`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ update }).toString(),
  });
  if (!response.ok) throw new HttpError(502, `Semantic store returned HTTP ${response.status}`);
  return { ok: true };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
