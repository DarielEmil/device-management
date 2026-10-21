// Duraciones de la sesión. Los valores por defecto son una propuesta: el
// issue #5 deja la duración abierta. Se pueden cambiar al componer los casos
// de uso sin tocar negocio.
export interface SessionPolicy {
  // Expiración deslizante: sin actividad durante este tiempo, la sesión vence.
  idleTimeoutMs: number;
  // Tope desde el login, aunque haya actividad continua.
  absoluteTimeoutMs: number;
  // Mínimo entre dos renovaciones, para no escribir en DB en cada petición.
  touchIntervalMs: number;
}

const MINUTE_MS = 60_000;

export const DEFAULT_SESSION_POLICY: SessionPolicy = {
  idleTimeoutMs: 30 * MINUTE_MS,
  absoluteTimeoutMs: 12 * 60 * MINUTE_MS,
  touchIntervalMs: MINUTE_MS,
};

// Próxima expiración tras actividad en `now`, sin pasar el tope absoluto.
export const nextExpiry = (
  createdAt: Date,
  now: Date,
  policy: SessionPolicy,
): Date =>
  new Date(
    Math.min(
      now.getTime() + policy.idleTimeoutMs,
      createdAt.getTime() + policy.absoluteTimeoutMs,
    ),
  );
