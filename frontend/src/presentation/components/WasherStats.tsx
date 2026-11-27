import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/presentation/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/presentation/ui/table";
import { Button } from "@/presentation/ui/button";
import { Car, DollarSign, Users, ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { format, startOfMonth, addMonths } from "date-fns";
import { es } from "date-fns/locale";
import { useMonthlyWashJobs } from "@/application/hooks/useMonthlyWashJobs";
import { useMonthlyWashStats } from "@/application/hooks/useMonthlyWashStats";
import { businessEarnings, formatCurrency, washerEarnings } from "@/application/services/wash-stats.service";
import { WASH_STATUS_LABELS } from "@/domain/enums/wash-status.enum";
import type { BusinessRole } from "@/domain/enums/business-role.enum";

interface WasherStatsProps {
  businessId: string;
  role: BusinessRole;
  washerId: string | null;
}

export function WasherStats({ businessId, role, washerId }: WasherStatsProps) {
  const [currentMonth, setCurrentMonth] = useState(() => startOfMonth(new Date()));
  const { jobs: loadedJobs, loading } = useMonthlyWashJobs(businessId, currentMonth);
  const { stats, loading: statsLoading, error: statsError } =
    useMonthlyWashStats(businessId, currentMonth);
  const allJobs = role === "washer"
    ? loadedJobs.filter((job) => job.washer_id === washerId)
    : loadedJobs;

  const washerSummaries = (stats?.by_washer ?? []).filter(
    (washer) => role !== "washer" || washer.washer_id === washerId,
  );
  const totalVehicles = washerSummaries.reduce((sum, washer) => sum + washer.total_jobs, 0);
  const totalEarnings = washerSummaries.reduce((sum, washer) => sum + washer.total_earnings, 0);

  if (loading || statsLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-pulse text-muted-foreground">Cargando estadísticas...</div>
      </div>
    );
  }

  const monthLabel = format(currentMonth, "MMMM yyyy", { locale: es });
  const isCurrentMonth = startOfMonth(new Date()).getTime() === startOfMonth(currentMonth).getTime();

  return (
    <div className="space-y-6">
      {statsError && <p role="alert" className="text-sm text-destructive">{statsError}</p>}
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

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Vehículos del Mes
            </CardTitle>
            <Car className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalVehicles}</div>
          </CardContent>
        </Card>

        <Card className="border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Ingresos del Mes
            </CardTitle>
            <DollarSign className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">{formatCurrency(totalEarnings)}</div>
          </CardContent>
        </Card>

        <Card className="border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Ganancia del Mes (60%)
            </CardTitle>
            <DollarSign className="h-5 w-5 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{formatCurrency(businessEarnings(totalEarnings))}</div>
          </CardContent>
        </Card>

        <Card className="border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Lavadores Activos
            </CardTitle>
            <Users className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{washerSummaries.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Per Washer Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Historial por Lavador - <span className="capitalize">{monthLabel}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {washerSummaries.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No hay registros de lavados en este mes
            </p>
          ) : (
            <div className="space-y-6">
              {washerSummaries.map((washer) => {
                const washerJobs = allJobs.filter(
                  (job) => job.washer_name === washer.washer_name
                );

                return (
                  <div key={washer.washer_name} className="border rounded-lg overflow-hidden">
                    {/* Washer Header */}
                    <div className="bg-primary/10 px-4 py-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                          <span className="text-primary font-bold text-lg">
                            {washer.washer_name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg">{washer.washer_name}</h3>
                          <p className="text-sm text-muted-foreground">
                            {washer.total_jobs} vehículo{washer.total_jobs !== 1 ? "s" : ""} lavado{washer.total_jobs !== 1 ? "s" : ""}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Total ganado</p>
                        <p className="text-xl font-bold text-primary">
                          {formatCurrency(washer.total_earnings)}
                        </p>
                      </div>
                    </div>

                    {/* Washer Jobs Table */}
                    <Table>
                      <TableHeader>
                        <TableRow>
                           <TableHead>Placa</TableHead>
                           <TableHead>Tipo de Auto</TableHead>
                           <TableHead>Tipo de Lavado</TableHead>
                           <TableHead>Estado</TableHead>
                           <TableHead className="text-right">Precio</TableHead>
                          <TableHead className="text-right">40%</TableHead>
                          <TableHead className="text-right">60%</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {washerJobs.map((job) => (
                          <TableRow key={job.id}>
                             <TableCell className="font-mono font-semibold">{job.license_plate || "—"}</TableCell>
                             <TableCell className="font-medium">{job.car_type}</TableCell>
                             <TableCell>{job.wash_type}</TableCell>
                            <TableCell>
                              <span
                                className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                  job.status === "delivered"
                                    ? "bg-blue-100 text-blue-800"
                                    : job.status === "completed"
                                    ? "bg-green-100 text-green-800"
                                    : job.status === "in_progress"
                                    ? "bg-yellow-100 text-yellow-800"
                                    : "bg-gray-100 text-gray-800"
                                }`}
                              >
                                {WASH_STATUS_LABELS[job.status]}
                              </span>
                            </TableCell>
                            <TableCell className="text-right font-semibold">
                              {formatCurrency(job.price)}
                            </TableCell>
                            <TableCell className="text-right font-semibold text-primary">
                              {formatCurrency(washerEarnings(job.price || 0))}
                            </TableCell>
                            <TableCell className="text-right font-semibold text-muted-foreground">
                              {formatCurrency(businessEarnings(job.price || 0))}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>

                    {/* Washer Totals */}
                    <div className="bg-muted/50 px-4 py-3 flex items-center justify-between border-t gap-6">
                      <div>
                        <span className="font-semibold text-sm">Total 40%: </span>
                        <span className="font-bold text-primary">{formatCurrency(washerEarnings(washer.total_earnings))}</span>
                      </div>
                      <div>
                        <span className="font-semibold text-sm">Total 60%: </span>
                        <span className="font-bold text-muted-foreground">{formatCurrency(businessEarnings(washer.total_earnings))}</span>
                      </div>
                    </div>
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
