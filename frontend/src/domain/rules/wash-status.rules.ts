import type { WashStatus } from "@/domain/enums/wash-status.enum";

export interface WashStatusTransition {
  next: WashStatus;
  label: string;
}

// Reglas de negocio: qué transición de estado sigue después de la actual.
export const WASH_STATUS_TRANSITIONS: Record<WashStatus, WashStatusTransition | null> = {
  pending: { next: "in_progress", label: "Iniciar Lavado" },
  in_progress: { next: "completed", label: "Marcar Completado" },
  completed: { next: "delivered", label: "Marcar Entregado" },
  delivered: null,
};

export function isWashStatusTransitionAllowed(current: WashStatus, next: WashStatus): boolean {
  return WASH_STATUS_TRANSITIONS[current]?.next === next;
}

// Reparto del pago de cada lavado entre el negocio y el lavador.
export const BUSINESS_EARNINGS_SHARE = 0.6;
export const WASHER_EARNINGS_SHARE = 0.4;
