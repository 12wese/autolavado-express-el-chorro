export type WashStatus = "pending" | "in_progress" | "completed" | "delivered";

export const WASH_STATUS_LABELS: Record<WashStatus, string> = {
  pending: "Pendiente",
  in_progress: "En Proceso",
  completed: "Completado",
  delivered: "Entregado",
};
