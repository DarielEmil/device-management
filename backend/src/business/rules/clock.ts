import type { Clock } from "../ports/clock.js";
import { isoDateInTimeZone } from "./dates.js";

// "Hoy" depende de la zona horaria: un préstamo vence según el calendario de
// la empresa, no según UTC ni la zona del servidor.
export const DEFAULT_TIME_ZONE = "America/Santo_Domingo";

export function createSystemClock(timeZone: string = DEFAULT_TIME_ZONE): Clock {
  return {
    now: () => new Date(),
    today: () => isoDateInTimeZone(new Date(), timeZone),
  };
}
