import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/presentation/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/presentation/ui/table";
import { Button } from "@/presentation/ui/button";
import { Car, DollarSign, CalendarDays, ChevronDown, ChevronRight, ChevronLeft, History } from "lucide-react";
import { format, parseISO, startOfMonth, addMonths } from "date-fns";
import { es } from "date-fns/locale";
import { useMonthlyWashJobs } from "@/application/hooks/useMonthlyWashJobs";
import { useWashJobStatusHistory } from "@/application/hooks/useWashJobStatusHistory";
import { businessEarnings, formatCurrency, summarizeByDay, washerEarnings } from "@/application/services/wash-stats.service";
import { WASH_STATUS_LABELS } from "@/domain/enums/wash-status.enum";
import type { BusinessRole } from "@/domain/enums/business-role.enum";

interface WashHistoryProps {
  businessId: string;
  role: BusinessRole;
  washerId: string | null;
}

export function WashHistory({ businessId, role, washerId }: WashHistoryProps) {
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());
  const [expandedWashers, setExpandedWashers] = useState<Set<string>>(new Set());
  const [expandedJobHistory, setExpandedJobHistory] = useState<Set<string>>(new Set());
  const [currentMonth, setCurrentMonth] = useState(() => startOfMonth(new Date()));
  const { jobs: loadedJobs, loading } = useMonthlyWashJobs(businessId, currentMonth);
  const jobs = role === "washer"
    ? loadedJobs.filter((job) => job.washer_id === washerId)
    : loadedJobs;
  const { historyByJobId, loading: historyLoading, error: historyError } =
    useWashJobStatusHistory(businessId, jobs.map((job) => job.id));

  const daySummaries = summarizeByDay(jobs);

  const toggleDay = (date: string) => {
    setExpandedDays((prev) => {
      const next = new Set(prev);
      if (next.has(date)) next.delete(date);
      else next.add(date);
      return next;
    });
  };

  const toggleWasher = (key: string) => {
    setExpandedWashers((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleJobHistory = (jobId: string) => {
    setExpandedJobHistory((prev) => {
      const next = new Set(prev);
      if (next.has(jobId)) next.delete(jobId);
      else next.add(jobId);
      return next;
    });
  };

  const totalGeneral = daySummaries.reduce((s, d) => s + d.totalEarnings, 0);
  const totalVehiclesGeneral = daySummaries.reduce((s, d) => s + d.totalVehicles, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-pulse text-muted-foreground">Cargando historial...</div>
      </div>
    );
  }

  const monthLabel = format(currentMonth, "MMMM yyyy", { locale: es });
  const isCurrentMonth = startOfMonth(new Date()).getTime() === startOfMonth(currentMonth).getTime();

  return (
    <div className="space-y-6">
      {/* Month navigation */}
      <div className="flex items-center justify-center gap-4">
        <Button variant="outline" size="icon" onClick={() => setCurrentMonth((m) => addMonths(m, -1))}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-2 min-w-[200px] justify-center">
          <CalendarDays className="h-5 w-5 text-primary" />
          <span className="text-lg font-semibold capitalize">{monthLabel}</span>
        </div>
        <Button variant="outline" size="icon" onClick={() => setCurrentMonth((m) => addMonths(m, 1))} disabled={isCurrentMonth}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Resumen del mes */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Vehículos del mes</CardTitle>
            <Car className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalVehiclesGeneral}</div>
          </CardContent>
        </Card>

        <Card className="border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Ingresos del mes</CardTitle>
            <DollarSign className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">{formatCurrency(totalGeneral)}</div>
          </CardContent>
        </Card>

        <Card className="border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Ganancia negocio (60%)</CardTitle>
            <DollarSign className="h-5 w-5 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{formatCurrency(businessEarnings(totalGeneral))}</div>
          </CardContent>
        </Card>
      </div>

      {/* Historial por día */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-primary" />
            Historial por Día - <span className="capitalize">{monthLabel}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {daySummaries.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No hay registros en este mes</p>
          ) : (
            <div className="space-y-3">
              {daySummaries.map((day) => {
                const isExpanded = expandedDays.has(day.date);
                const label = format(parseISO(day.date), "EEEE d 'de' MMMM, yyyy", { locale: es });

                return (
                  <div key={day.date} className="border rounded-lg overflow-hidden">
                    {/* Day header */}
                    <button
                      className="w-full bg-primary/10 px-4 py-3 flex items-center justify-between hover:bg-primary/15 transition-colors"
                      onClick={() => toggleDay(day.date)}
                    >
                      <div className="flex items-center gap-3">
                        {isExpanded ? <ChevronDown className="h-4 w-4 text-primary" /> : <ChevronRight className="h-4 w-4 text-primary" />}
                        <div className="text-left">
                          <p className="font-semibold capitalize">{label}</p>
                          <p className="text-xs text-muted-foreground">
                            {day.totalVehicles} vehículo{day.totalVehicles !== 1 ? "s" : ""} · {day.washers.size} lavador{day.washers.size !== 1 ? "es" : ""}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-primary">{formatCurrency(day.totalEarnings)}</p>
                        <p className="text-xs text-green-600">60%: {formatCurrency(businessEarnings(day.totalEarnings))}</p>
                      </div>
                    </button>

                    {/* Washers of that day */}
                    {isExpanded && (
                      <div className="divide-y">
                        {Array.from(day.washers.entries()).map(([washerName, washerData]) => {
                          const washerKey = `${day.date}-${washerName}`;
                          const washerExpanded = expandedWashers.has(washerKey);

                          return (
                            <div key={washerKey}>
                              <button
                                className="w-full px-6 py-3 flex items-center justify-between bg-muted/30 hover:bg-muted/50 transition-colors"
                                onClick={() => toggleWasher(washerKey)}
                              >
                                <div className="flex items-center gap-3">
                                  {washerExpanded ? <ChevronDown className="h-3 w-3 text-muted-foreground" /> : <ChevronRight className="h-3 w-3 text-muted-foreground" />}
                                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                                    <span className="text-primary font-bold text-sm">{washerName.charAt(0).toUpperCase()}</span>
                                  </div>
                                  <div className="text-left">
                                    <p className="font-semibold text-sm">{washerName}</p>
                                    <p className="text-xs text-muted-foreground">{washerData.jobs.length} trabajo{washerData.jobs.length !== 1 ? "s" : ""}</p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className="font-semibold text-sm text-primary">{formatCurrency(washerData.earnings)}</p>
                                  <p className="text-xs text-muted-foreground">40%: {formatCurrency(washerEarnings(washerData.earnings))}</p>
                                </div>
                              </button>

                              {washerExpanded && (
                                <Table>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead>Placa</TableHead>
                                      <TableHead>Tipo Auto</TableHead>
                                      <TableHead>Tipo Lavado</TableHead>
                                      <TableHead>Adiciones</TableHead>
                                      <TableHead>Estado</TableHead>
                                      <TableHead className="text-right">Precio total</TableHead>
                                      <TableHead className="text-right">40%</TableHead>
                                      <TableHead className="text-right">60%</TableHead>
                                      <TableHead>Trazabilidad</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {washerData.jobs.map((job) => (
                                      <TableRow key={job.id}>
                                        <TableCell className="font-mono font-semibold">{job.license_plate || "—"}</TableCell>
                                        <TableCell>{job.car_type}</TableCell>
                                        <TableCell>{job.wash_type}</TableCell>
                                        <TableCell>
                                          {job.addons.length === 0 ? (
                                            "—"
                                          ) : (
                                            <ul className="space-y-1">
                                              {job.addons.map((addon) => (
                                                <li key={addon.id}>
                                                  {addon.addon_name_snapshot} (+{formatCurrency(addon.price_snapshot)})
                                                </li>
                                              ))}
                                            </ul>
                                          )}
                                        </TableCell>
                                        <TableCell>
                                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                            job.status === "delivered" ? "bg-blue-100 text-blue-800"
                                            : job.status === "completed" ? "bg-green-100 text-green-800"
                                            : job.status === "in_progress" ? "bg-yellow-100 text-yellow-800"
                                            : "bg-gray-100 text-gray-800"
                                          }`}>
                                            {WASH_STATUS_LABELS[job.status]}
                                          </span>
                                        </TableCell>
                                        <TableCell className="text-right font-semibold">{formatCurrency(job.price)}</TableCell>
                                        <TableCell className="text-right text-primary font-semibold">{formatCurrency(washerEarnings(job.price || 0))}</TableCell>
                                        <TableCell className="text-right text-muted-foreground font-semibold">{formatCurrency(businessEarnings(job.price || 0))}</TableCell>
                                        <TableCell>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            className="gap-2"
                                            aria-expanded={expandedJobHistory.has(job.id)}
                                            onClick={() => toggleJobHistory(job.id)}
                                          >
                                            <History className="h-4 w-4" />
                                            {expandedJobHistory.has(job.id) ? "Ocultar" : "Ver"}
                                          </Button>
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                    {washerData.jobs.map((job) =>
                                      expandedJobHistory.has(job.id) ? (
                                        <TableRow key={`${job.id}-status-history`}>
                                          <TableCell colSpan={9}>
                                            <div className="space-y-2 py-1">
                                              <p className="font-semibold text-sm">Trazabilidad del lavado</p>
                                              {historyLoading ? (
                                                <p className="text-sm text-muted-foreground">Cargando trazabilidad...</p>
                                              ) : historyError ? (
                                                <p className="text-sm text-destructive">{historyError}</p>
                                              ) : (historyByJobId[job.id] ?? []).length === 0 ? (
                                                <p className="text-sm text-muted-foreground">
                                                  No hay cambios registrados para este lavado.
                                                </p>
                                              ) : (
                                                <ol className="space-y-2">
                                                  {(historyByJobId[job.id] ?? []).map((event) => (
                                                    <li key={event.id} className="flex flex-wrap items-center gap-x-2 text-sm">
                                                      <span className="font-medium">
                                                        {event.old_status
                                                          ? `${WASH_STATUS_LABELS[event.old_status]} → ${WASH_STATUS_LABELS[event.new_status]}`
                                                          : `${WASH_STATUS_LABELS[event.new_status]} (inicio)`}
                                                      </span>
                                                      <span className="text-muted-foreground">
                                                        {format(parseISO(event.changed_at), "d MMM yyyy, HH:mm", { locale: es })}
                                                      </span>
                                                    </li>
                                                  ))}
                                                </ol>
                                              )}
                                            </div>
                                          </TableCell>
                                        </TableRow>
                                      ) : null,
                                    )}
                                  </TableBody>
                                </Table>
                              )}
                            </div>
                          );
                        })}

                        {/* Day totals */}
                        <div className="bg-muted/50 px-4 py-3 flex flex-wrap items-center justify-between gap-4 border-t">
                          <span className="font-semibold text-sm">Total del día: <span className="text-primary">{formatCurrency(day.totalEarnings)}</span></span>
                          <span className="font-semibold text-sm">Ganancia negocio (60%): <span className="text-green-600">{formatCurrency(businessEarnings(day.totalEarnings))}</span></span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
