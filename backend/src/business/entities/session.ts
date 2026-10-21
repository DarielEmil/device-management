// Sesión stateful. `id` es el hash SHA-256 del token: el token en claro solo
// viaja en la cookie del navegador y nunca se guarda.
export interface Session {
  id: string;
  userId: string;
  createdAt: Date;
  lastSeenAt: Date;
  // Expiración deslizante: se extiende con la actividad, sin superar el tope
  // absoluto contado desde el login (ver SessionPolicy).
  expiresAt: Date;
}
