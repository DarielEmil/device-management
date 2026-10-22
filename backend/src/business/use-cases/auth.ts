import { DomainError } from "../entities/errors.js";
import type { Session } from "../entities/session.js";
import {
  actorFrom,
  toPublicUser,
  type Actor,
  type CredentialsInput,
  type PublicUser,
  type RegistrationInput,
  type User,
} from "../entities/user.js";
import type { Repositories } from "../ports/repositories.js";
import { generateSessionToken, hashSessionToken } from "../rules/security.js";
import { DEFAULT_SESSION_POLICY, nextExpiry } from "../rules/session.js";
import {
  parseCredentials,
  parseEmail,
  parseRegistration,
} from "../rules/validation.js";
import { newId, type UseCaseDeps } from "./deps.js";

// `token` es lo único que viaja al navegador (en una cookie HttpOnly que pone
// presentación). En la base de datos solo queda su hash como id de sesión.
export interface AuthResult {
  token: string;
  session: Session;
  user: PublicUser;
}

export interface CurrentSession {
  session: Session;
  user: PublicUser;
  actor: Actor;
}

// `currentToken`: token de una sesión previa en el mismo navegador. Se
// invalida al iniciar la nueva para regenerar el id de sesión.
export interface SessionOptions {
  currentToken?: string;
}

const INVALID_CREDENTIALS = "Correo o contraseña incorrectos.";
const EMAIL_TAKEN = "Ya existe una cuenta con este correo.";

const invalidCredentials = () =>
  new DomainError(INVALID_CREDENTIALS, "UNAUTHENTICATED", {
    password: INVALID_CREDENTIALS,
  });

const noSession = (message = "Inicia sesión para continuar.") =>
  new DomainError(message, "UNAUTHENTICATED");

export function createAuthUseCases({
  uow,
  clock,
  passwordHasher,
  notifier,
  sessionPolicy = DEFAULT_SESSION_POLICY,
}: UseCaseDeps) {
  async function openSession(
    repositories: Repositories,
    user: User,
    options: SessionOptions,
  ): Promise<AuthResult> {
    if (options.currentToken)
      await repositories.sessions.delete(hashSessionToken(options.currentToken));
    const token = generateSessionToken();
    const now = clock.now();
    const session: Session = {
      id: hashSessionToken(token),
      userId: user.id,
      createdAt: now,
      lastSeenAt: now,
      expiresAt: nextExpiry(now, now, sessionPolicy),
    };
    await repositories.sessions.insert(session);
    return { token, session, user: toPublicUser(user) };
  }

  return {
    // Registro público: siempre crea una cuenta Empleado activa, sin vínculo
    // con un empleado (no se adivina por nombre ni correo), y abre sesión.
    async register(
      input: RegistrationInput,
      options: SessionOptions = {},
    ): Promise<AuthResult> {
      const data = parseRegistration(input);
      if (await uow.repositories.users.findByEmail(data.email))
        throw new DomainError(EMAIL_TAKEN, "CONFLICT", { email: EMAIL_TAKEN });
      // Fuera de la transacción: scrypt es lento a propósito.
      const passwordHash = await passwordHasher.hash(data.password);
      return uow.transaction(async (repositories) => {
        if (await repositories.users.findByEmail(data.email))
          throw new DomainError(EMAIL_TAKEN, "CONFLICT", { email: EMAIL_TAKEN });
        const user: User = {
          id: newId(clock),
          name: data.name,
          email: data.email,
          role: "Empleado",
          status: "Activo",
          employeeId: null,
          passwordHash,
          createdAt: clock.now(),
        };
        await repositories.users.insert(user);
        return openSession(repositories, user, options);
      });
    },

    // Mismo error para correo inexistente, contraseña incorrecta o cuenta no
    // activa, y mismo costo de cálculo: no revela qué cuentas existen.
    async login(
      input: CredentialsInput,
      options: SessionOptions = {},
    ): Promise<AuthResult> {
      const credentials = parseCredentials(input);
      const user = await uow.repositories.users.findByEmail(credentials.email);
      if (!user || user.status !== "Activo" || !user.passwordHash) {
        await passwordHasher.hash(credentials.password);
        throw invalidCredentials();
      }
      if (!(await passwordHasher.verify(credentials.password, user.passwordHash)))
        throw invalidCredentials();
      return uow.transaction((repositories) =>
        openSession(repositories, user, options),
      );
    },

    // Idempotente: cerrar una sesión que ya no existe no es un error.
    async logout(token: string | undefined): Promise<void> {
      if (token) await uow.repositories.sessions.delete(hashSessionToken(token));
    },

    // Valida la sesión de cada petición y devuelve el actor para los demás
    // casos de uso. Renueva la expiración (deslizante) como mucho una vez por
    // `touchIntervalMs`, sin pasar el tope absoluto.
    async getCurrentSession(token: string | undefined): Promise<CurrentSession> {
      if (!token) throw noSession();
      const { sessions, users } = uow.repositories;
      const id = hashSessionToken(token);
      const session = await sessions.findById(id);
      if (!session) throw noSession();
      const now = clock.now();
      if (now.getTime() >= session.expiresAt.getTime()) {
        await sessions.delete(id);
        throw noSession("Tu sesión expiró. Inicia sesión de nuevo.");
      }
      const user = await users.findById(session.userId);
      if (!user || user.status !== "Activo") {
        await sessions.delete(id);
        throw noSession();
      }
      let current = session;
      if (now.getTime() - session.lastSeenAt.getTime() >= sessionPolicy.touchIntervalMs) {
        const expiresAt = nextExpiry(session.createdAt, now, sessionPolicy);
        await sessions.touch(id, now, expiresAt);
        current = { ...session, lastSeenAt: now, expiresAt };
      }
      return { session: current, user: toPublicUser(user), actor: actorFrom(user) };
    },

    // Responde igual exista o no la cuenta. Solo avisa a cuentas activas; el
    // enlace y el cambio de contraseña dependen del proveedor de correo y de
    // dónde guardar el token de recuperación (pendiente, ver README).
    async requestPasswordRecovery(email: string): Promise<void> {
      const address = parseEmail(email);
      const user = await uow.repositories.users.findByEmail(address);
      if (user?.status === "Activo")
        await notifier.passwordRecoveryRequested(toPublicUser(user));
    },
  };
}

export type AuthUseCases = ReturnType<typeof createAuthUseCases>;
