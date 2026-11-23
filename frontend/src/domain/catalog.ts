// Catálogo compartido de tipos de auto y tipos de lavado — usado tanto por el
// formulario manual (NewWashDialog) como por el flujo rápido de escaneo QR,
// y por la matriz de precios en Configuración, para que los tres hablen
// siempre de las mismas opciones.
export const CAR_TYPES = ["Camioneta", "Automóvil", "Moto", "SUV", "Pickup", "Van"] as const;

// Nombres reales de los servicios de Autolavado Express El Chorro (lista de
// precios impresa en el local). "Lavada", "Lavada + Desengrasada" y
// "Lavada + Polichada" son específicos del combo de motos.
export const WASH_TYPES = [
  "Lavada General",
  "Lavada Sencilla",
  "Latazo",
  "Quitada de Asfalto",
  "Lavada",
  "Lavada + Desengrasada",
  "Lavada + Polichada",
] as const;
