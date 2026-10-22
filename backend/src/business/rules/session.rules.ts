export interface SessionPolicy {
  idleTimeoutMs: number;
  absoluteTimeoutMs: number;
  // Mínimo entre renovaciones, para no escribir en la DB en cada petición.
  touchIntervalMs: number;
}

const MINUTE_MS = 60_000;

export const DEFAULT_SESSION_POLICY: SessionPolicy = {
  idleTimeoutMs: 30 * MINUTE_MS,
  absoluteTimeoutMs: 12 * 60 * MINUTE_MS,
  touchIntervalMs: MINUTE_MS,
};

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
