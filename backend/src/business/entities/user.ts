export const roles = ["Encargado", "Empleado"] as const;
export type Role = (typeof roles)[number];

// Invitado: creada por un Encargado, aún sin contraseña.
// Inactivo: baja lógica; no puede iniciar sesión.
export const userStatuses = ["Activo", "Inactivo", "Invitado"] as const;
export type UserStatus = (typeof userStatuses)[number];

export interface User {
  id: string;
  name: string;
  // Siempre en minúsculas y único.
  email: string;
  role: Role;
  status: UserStatus;
  // Empleado vinculado, si lo hay. Una cuenta no tiene por qué tener empleado.
  employeeId: string | null;
  // null mientras la cuenta está Invitado.
  passwordHash: string | null;
  createdAt: Date;
}

// Lo que sale de negocio hacia afuera: nunca el hash de la contraseña.
export type PublicUser = Omit<User, "passwordHash">;

export function toPublicUser(user: User): PublicUser {
  const { id, name, email, role, status, employeeId, createdAt } = user;
  return { id, name, email, role, status, employeeId, createdAt };
}

// Quién ejecuta un caso de uso. Presentación lo obtiene de la sesión vigente
// (auth.getCurrentSession) y lo pasa a cada caso de uso protegido.
export interface Actor {
  userId: string;
  role: Role;
  employeeId: string | null;
}

export const actorFrom = (
  user: Pick<User, "id" | "role" | "employeeId">,
): Actor => ({
  userId: user.id,
  role: user.role,
  employeeId: user.employeeId,
});

export interface CredentialsInput {
  email: string;
  password: string;
}

export interface RegistrationInput extends CredentialsInput {
  name: string;
}

export interface InvitationInput {
  email: string;
  role: string;
  // Vacío o ausente: la cuenta no se vincula a ningún empleado.
  employeeId?: string;
}
