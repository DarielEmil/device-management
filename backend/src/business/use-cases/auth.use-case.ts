import { DomainError, DomainErrorCode } from "../entities/errors.entity.js";
import type { Session } from "../entities/session.entity.js";
import {
  actorFrom,
  Role,
  toPublicUser,
  UserStatus,
  type Actor,
  type CredentialsInput,
  type PublicUser,
  type RegistrationInput,
  type User,
} from "../entities/user.entity.js";
import type { Repositories } from "../ports/repositories.js";
import { generateSessionToken, hashSessionToken } from "../rules/security.rules.js";
import { DEFAULT_SESSION_POLICY, nextExpiry } from "../rules/session.rules.js";
import {
  parseCredentials,
  parseEmail,
  parseRegistration,
} from "../rules/validation.rules.js";
import { newId, type UseCaseDeps } from "./deps.use-case.js";

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

// `currentToken` se invalida al iniciar sesión para regenerar el id de sesión.
export interface SessionOptions {
  currentToken?: string;
}

const INVALID_CREDENTIALS = "Correo o contraseña incorrectos.";
const EMAIL_TAKEN = "Ya existe una cuenta con este correo.";

const invalidCredentials = () =>
  new DomainError(INVALID_CREDENTIALS, DomainErrorCode.Unauthenticated, {
    password: INVALID_CREDENTIALS,
  });

const noSession = (message = "Inicia sesión para continuar.") =>
  new DomainError(message, DomainErrorCode.Unauthenticated);

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
    // Nunca se vincula a un empleado: no se adivina por nombre ni correo.
    async register(
      input: RegistrationInput,
      options: SessionOptions = {},
    ): Promise<AuthResult> {
      const data = parseRegistration(input);
      if (await uow.repositories.users.findByEmail(data.email))
        throw new DomainError(EMAIL_TAKEN, DomainErrorCode.Conflict, { email: EMAIL_TAKEN });
      // Fuera de la transacción: scrypt es lento a propósito.
      const passwordHash = await passwordHasher.hash(data.password);
      return uow.transaction(async (repositories) => {
        if (await repositories.users.findByEmail(data.email))
          throw new DomainError(EMAIL_TAKEN, DomainErrorCode.Conflict, { email: EMAIL_TAKEN });
        const user: User = {
          id: newId(clock),
          name: data.name,
          email: data.email,
          role: Role.Employee,
          status: UserStatus.Active,
          employeeId: null,
          passwordHash,
          createdAt: clock.now(),
        };
        await repositories.users.insert(user);
        return openSession(repositories, user, options);
      });
    },

    // Mismo error y mismo costo en todos los fallos: no revela qué cuentas existen.
    async login(
      input: CredentialsInput,
      options: SessionOptions = {},
    ): Promise<AuthResult> {
      const credentials = parseCredentials(input);
      const user = await uow.repositories.users.findByEmail(credentials.email);
      if (!user || user.status !== UserStatus.Active || !user.passwordHash) {
        await passwordHasher.hash(credentials.password);
        throw invalidCredentials();
      }
      if (!(await passwordHasher.verify(credentials.password, user.passwordHash)))
        throw invalidCredentials();
      return uow.transaction((repositories) =>
        openSession(repositories, user, options),
      );
    },

    async logout(token: string | undefined): Promise<void> {
      if (token) await uow.repositories.sessions.delete(hashSessionToken(token));
    },

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
      if (!user || user.status !== UserStatus.Active) {
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

    async requestPasswordRecovery(email: string): Promise<void> {
      const address = parseEmail(email);
      const user = await uow.repositories.users.findByEmail(address);
      if (user?.status === UserStatus.Active)
        await notifier.passwordRecoveryRequested(toPublicUser(user));
    },
  };
}

export type AuthUseCases = ReturnType<typeof createAuthUseCases>;
