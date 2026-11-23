import { Clock, PlayCircle, CheckCircle2, PackageCheck } from "lucide-react";
import { WashCard } from "./WashCard";
import { useWashJobs } from "@/application/hooks/useWashJobs";
import { WASH_STATUS_LABELS, type WashStatus } from "@/domain/enums/wash-status.enum";
import type { BusinessRole } from "@/domain/enums/business-role.enum";

const columns = [
  {
    id: "pending" as WashStatus,
    title: WASH_STATUS_LABELS.pending,
    icon: Clock,
    bgClass: "bg-status-pending-bg",
    borderClass: "border-status-pending",
    iconClass: "text-status-pending",
  },
  {
    id: "in_progress" as WashStatus,
    title: WASH_STATUS_LABELS.in_progress,
    icon: PlayCircle,
    bgClass: "bg-status-progress-bg",
    borderClass: "border-status-progress",
    iconClass: "text-status-progress",
  },
  {
    id: "completed" as WashStatus,
    title: WASH_STATUS_LABELS.completed,
    icon: CheckCircle2,
    bgClass: "bg-status-completed-bg",
    borderClass: "border-status-completed",
    iconClass: "text-status-completed",
  },
  {
    id: "delivered" as WashStatus,
    title: WASH_STATUS_LABELS.delivered,
    icon: PackageCheck,
    bgClass: "bg-status-delivered-bg",
    borderClass: "border-status-delivered",
    iconClass: "text-status-delivered",
  },
];

interface KanbanBoardProps {
  businessId: string;
  role: BusinessRole;
  washerId: string | null;
}

export function KanbanBoard({ businessId, role, washerId }: KanbanBoardProps) {
  const { jobs, loading, changeStatus, removeJob } = useWashJobs(businessId, role, washerId);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {columns.map((col) => (
          <div key={col.id} className="bg-muted/50 rounded-xl p-4 animate-pulse h-96" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
      {columns.map((column) => {
        const columnJobs = jobs.filter((job) => job.status === column.id);
        const columnTotal = columnJobs.reduce((sum, job) => sum + (job.price || 0), 0);
        const Icon = column.icon;

        return (
          <div
            key={column.id}
            className={`rounded-xl border-2 ${column.borderClass} ${column.bgClass} p-4 min-h-[400px]`}
          >
            <div className="flex items-center gap-2 mb-2">
              <Icon className={`w-5 h-5 ${column.iconClass}`} />
              <h2 className="font-display font-semibold">{column.title}</h2>
              <span className="ml-auto bg-card px-2 py-0.5 rounded-full text-sm font-medium shadow-sm">
                {columnJobs.length}
              </span>
            </div>
            <div className="text-sm text-muted-foreground mb-4 font-medium">
              Total: ${columnTotal.toFixed(2)}
            </div>

            <div className="space-y-3">
              {columnJobs.map((job) => (
                <WashCard
                  key={job.id}
                  job={job}
                  onStatusChange={(id, status) => changeStatus(id, status, WASH_STATUS_LABELS[status])}
                  onDelete={removeJob}
                  canDelete={role === "admin"}
                  canAdvance={role === "admin" || job.washer_id === washerId}
                  currentStatus={column.id}
                />
              ))}

              {columnJobs.length === 0 && (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  No hay trabajos aquí
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
