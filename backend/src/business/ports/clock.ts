import type { IsoDate } from "../entities/loan.js";

// Inyectado para que las reglas de fechas (vencimientos, expiración de
// sesión) sean deterministas en los tests.
export interface Clock {
  now(): Date;
  // Fecha de hoy en la zona horaria de la empresa.
  today(): IsoDate;
}
