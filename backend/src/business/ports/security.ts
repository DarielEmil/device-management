// Hash de contraseñas. La implementación por defecto es scrypt
// (rules/security.ts); los tests usan una falsa porque scrypt es lento a
// propósito.
export interface PasswordHasher {
  hash(password: string): Promise<string>;
  verify(password: string, passwordHash: string): Promise<boolean>;
}
