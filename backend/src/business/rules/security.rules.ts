import {
  createHash,
  randomBytes,
  scrypt,
  timingSafeEqual,
  type ScryptOptions,
} from "node:crypto";
import type { PasswordHasher } from "../ports/security.js";

// Solo se guarda el hash del token: una copia de la DB no permite suplantar a nadie.
export const generateSessionToken = (): string =>
  randomBytes(32).toString("base64url");

export const hashSessionToken = (token: string): string =>
  createHash("sha256").update(token).digest("hex");

export interface ScryptCost {
  N: number;
  r: number;
  p: number;
}

// Mínimo que recomienda OWASP para scrypt (~128 MiB por hash).
export const DEFAULT_SCRYPT_COST: ScryptCost = { N: 2 ** 17, r: 8, p: 1 };

const KEY_LENGTH = 32;
const SCHEME = "scrypt";

const derive = (password: string, salt: Buffer, length: number, cost: ScryptCost) =>
  new Promise<Buffer>((resolve, reject) => {
    // scrypt usa 128·N·r bytes; se deja margen.
    const options: ScryptOptions = { ...cost, maxmem: 256 * cost.N * cost.r };
    scrypt(password.normalize("NFKC"), salt, length, options, (error, key) =>
      error ? reject(error) : resolve(key),
    );
  });

const MAX_SCRYPT_MEMORY = 256 * 1024 * 1024;
const MAX_SCRYPT_P = 4;

const isPositiveInteger = (value: number) =>
  Number.isSafeInteger(value) && value > 0;

// Node exige N potencia de 2 > 1; el tope de memoria va primero porque los operadores de bits son de 32 bits.
export const isSupportedScryptCost = ({ N, r, p }: ScryptCost): boolean =>
  [N, r, p].every(isPositiveInteger) &&
  128 * N * r <= MAX_SCRYPT_MEMORY &&
  p <= MAX_SCRYPT_P &&
  N > 1 &&
  (N & (N - 1)) === 0;

// Guardar el costo junto al hash permite subirlo sin invalidar contraseñas.
export function createScryptPasswordHasher(
  cost: ScryptCost = DEFAULT_SCRYPT_COST,
): PasswordHasher {
  // Fallar al arrancar: con un costo inválido verify rechazaría los propios hashes.
  if (!isSupportedScryptCost(cost)) {
    throw new Error(`Costo de scrypt no soportado: N=${cost.N}, r=${cost.r}, p=${cost.p}`);
  }
  return {
    async hash(password) {
      const salt = randomBytes(16);
      const key = await derive(password, salt, KEY_LENGTH, cost);
      return [SCHEME, cost.N, cost.r, cost.p, salt.toString("base64url"), key.toString("base64url")].join("$");
    },
    async verify(password, passwordHash) {
      const [scheme, n, r, p, salt, hash, ...rest] = passwordHash.split("$");
      if (scheme !== SCHEME || !salt || !hash || rest.length > 0) return false;
      const stored = { N: Number(n), r: Number(r), p: Number(p) };
      if (!isSupportedScryptCost(stored)) return false;
      const expected = Buffer.from(hash, "base64url");
      if (expected.length !== KEY_LENGTH) return false;
      let key: Buffer;
      try {
        key = await derive(password, Buffer.from(salt, "base64url"), KEY_LENGTH, stored);
      } catch {
        // Un hash que scrypt no acepta es credencial inválida (401), no error del servidor (500).
        return false;
      }
      return timingSafeEqual(key, expected);
    },
  };
}
