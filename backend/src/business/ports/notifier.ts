import type { PublicUser } from "../entities/user.js";

// Avisos a la persona dueña de la cuenta (correo u otro canal). Todavía no hay
// proveedor de correo: la composición puede inyectar uno que solo registre en
// el log, como hace hoy el frontend con sus simulaciones.
export interface AccountNotifier {
  invitationCreated(user: PublicUser): Promise<void>;
  passwordRecoveryRequested(user: PublicUser): Promise<void>;
}
