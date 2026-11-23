import { useCallback, useEffect, useState } from "react";
import {
  checkFusekiHealth,
  runSparqlQuery,
} from "@/data/semantic/fuseki.repository";
import type { SparqlSelectResults } from "@/domain/semantic/sparql-results";

export function useSemanticGraph() {
  const [connected, setConnected] = useState<boolean | null>(null);
  const [checkingConnection, setCheckingConnection] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [results, setResults] = useState<SparqlSelectResults | null>(null);
  const [queryError, setQueryError] = useState<string | null>(null);
  const [querying, setQuerying] = useState(false);

  const refreshHealth = useCallback(async () => {
    setCheckingConnection(true);
    try {
      setConnected(await checkFusekiHealth());
      setConnectionError(null);
    } catch (error) {
      setConnected(false);
      setConnectionError(
        error instanceof Error ? error.message : "No se pudo conectar con Fuseki.",
      );
    } finally {
      setCheckingConnection(false);
    }
  }, []);

  useEffect(() => {
    void refreshHealth();
    const intervalId = window.setInterval(() => void refreshHealth(), 15_000);
    return () => window.clearInterval(intervalId);
  }, [refreshHealth]);

  const executeQuery = useCallback(async (query: string) => {
    setQuerying(true);
    setQueryError(null);
    try {
      setResults(await runSparqlQuery(query));
    } catch (error) {
      setResults(null);
      setQueryError(
        error instanceof Error ? error.message : "No se pudo ejecutar la consulta SPARQL.",
      );
    } finally {
      setQuerying(false);
    }
  }, []);

  return {
    connected,
    checkingConnection,
    connectionError,
    refreshHealth,
    results,
    queryError,
    querying,
    executeQuery,
  };
}
