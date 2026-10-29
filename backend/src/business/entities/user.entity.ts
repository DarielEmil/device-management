export const Role = {
  Manager: "manager",
  Employee: "employee",
} as const;
export type Role = (typeof Role)[keyof typeof Role];

export const UserStatus = {
  Active: "active",
  Inactive: "inactive",
  Invited: "invited",
} as const;
export type UserStatus = (typeof UserStatus)[keyof typeof UserStatus];

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: UserStatus;
  employeeId: string | null;
  passwordHash: string | null;
  createdAt: Date;
}

export type PublicUser = Omit<User, "passwordHash">;

export function toPublicUser(user: User): PublicUser {
  const { id, name, email, role, status, employeeId, createdAt } = user;
  return { id, name, email, role, status, employeeId, createdAt };
}

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
  employeeId?: string;
}

export interface LinkEmployeeInput {
  employeeId: string;
}
