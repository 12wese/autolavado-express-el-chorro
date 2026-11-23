import { useState } from "react";
import { CheckCircle2, Loader2, Play, RefreshCw, Search, XCircle } from "lucide-react";
import { useSemanticGraph } from "@/application/hooks/useSemanticGraph";
import { normalizeLicensePlate } from "@/domain/validators/vehicle-qr.validator";
import {
  historyByPlateQuery,
  initialCustomQuery,
  ontologyTriplesQuery,
  washJobsQuery,
} from "@/domain/semantic/wash-job-queries";
import type { SparqlBindingValue } from "@/domain/semantic/sparql-results";
import { Button } from "@/presentation/ui/button";
import { Input } from "@/presentation/ui/input";
import { Textarea } from "@/presentation/ui/textarea";

function getBindingValue(binding: SparqlBindingValue | undefined): string {
  if (!binding) return "—";
  return binding.value;
}

export function SemanticGraphPanel() {
  const {
    connected,
    checkingConnection,
    connectionError,
    refreshHealth,
    results,
    queryError,
    querying,
    executeQuery,
  } = useSemanticGraph();
  const [plate, setPlate] = useState("");
  const [query, setQuery] = useState(initialCustomQuery);

  const run = (sparql: string) => {
    setQuery(sparql);
    void executeQuery(sparql);
  };

  const normalizedPlate = normalizeLicensePlate(plate);
  const connectionLabel = connected === true
    ? "Conectado a /Autolavado"
    : connected === false
      ? "Desconectado"
      : "Comprobando Fuseki...";

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card p-4">
        <div className="flex items-center gap-2" role="status" aria-live="polite">
          {connected === true
            ? <CheckCircle2 className="h-5 w-5 text-green-600" />
            : connected === false
              ? <XCircle className="h-5 w-5 text-destructive" />
              : <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
          <span className="font-medium">{connectionLabel}</span>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => void refreshHealth()}
          disabled={checkingConnection}
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${checkingConnection ? "animate-spin" : ""}`} />
          Verificar conexión
        </Button>
      </div>
      {connectionError && (
        <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          Error de conexión con Fuseki: {connectionError}
        </p>
      )}

      <section className="space-y-3 rounded-lg border bg-card p-4">
        <h2 className="font-semibold">Consultas rápidas</h2>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={() => run(ontologyTriplesQuery)}>
            Listar tripletas de la ontología
          </Button>
          <Button type="button" variant="outline" onClick={() => run(washJobsQuery)}>
            Trabajos de lavado registrados
          </Button>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            aria-label="Placa para consultar historial semántico"
            placeholder="Placa para consultar historial"
            value={plate}
            onChange={(event) => setPlate(event.target.value)}
            maxLength={20}
          />
          <Button
            type="button"
            variant="outline"
            disabled={!normalizedPlate}
            onClick={() => run(historyByPlateQuery(plate))}
          >
            Historial por placa
          </Button>
        </div>
      </section>

      <section className="space-y-3 rounded-lg border bg-card p-4">
        <h2 className="font-semibold">Consulta SPARQL personalizada</h2>
        <Textarea
          aria-label="Consulta SPARQL"
          className="min-h-36 font-mono text-sm"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          spellCheck={false}
        />
        <Button
          type="button"
          onClick={() => void executeQuery(query)}
          disabled={querying || !query.trim()}
        >
          {querying
            ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            : <Play className="mr-2 h-4 w-4" />}
          Ejecutar consulta
        </Button>
      </section>

      {queryError && (
        <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          <Search className="mr-2 inline h-4 w-4" />
          {queryError}
        </p>
      )}

      {results && (
        <section className="space-y-3 rounded-lg border bg-card p-4">
          <h2 className="font-semibold">Resultados ({results.results.bindings.length})</h2>
          {results.results.bindings.length === 0 ? (
            <p className="text-sm text-muted-foreground">La consulta no devolvió resultados.</p>
          ) : (
            <div className="max-h-[28rem] overflow-auto">
              <table className="w-full border-collapse text-left text-sm">
                <thead className="sticky top-0 bg-muted">
                  <tr>
                    {results.head.vars.map((variable) => (
                      <th key={variable} className="border px-3 py-2 font-medium">{variable}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {results.results.bindings.map((row, rowIndex) => (
                    <tr key={rowIndex} className="odd:bg-background even:bg-muted/30">
                      {results.head.vars.map((variable) => (
                        <td key={variable} className="max-w-md break-all border px-3 py-2 align-top">
                          {getBindingValue(row[variable])}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </section>
  );
}
