import {
  createHash,
  randomBytes,
  scrypt,
  timingSafeEqual,
  type ScryptOptions,
} from "node:crypto";
import type { PasswordHasher } from "../ports/security.js";

// Token de sesión: 256 bits aleatorios. Solo su hash se guarda como id de la
// sesión, así una copia de la base de datos no permite suplantar a nadie.
export const generateSessionToken = (): string =>
  randomBytes(32).toString("base64url");

export const hashSessionToken = (token: string): string =>
  createHash("sha256").update(token).digest("hex");

export interface ScryptCost {
  N: number;
  r: number;
  p: number;
}

// Parámetros mínimos que recomienda OWASP para scrypt (~128 MiB por hash).
export const DEFAULT_SCRYPT_COST: ScryptCost = { N: 2 ** 17, r: 8, p: 1 };

const KEY_LENGTH = 32;
const SCHEME = "scrypt";

const derive = (password: string, salt: Buffer, length: number, cost: ScryptCost) =>
  new Promise<Buffer>((resolve, reject) => {
    // scrypt usa 128·N·r bytes; se deja margen sobre ese tamaño.
    const options: ScryptOptions = { ...cost, maxmem: 256 * cost.N * cost.r };
    scrypt(password.normalize("NFKC"), salt, length, options, (error, key) =>
      error ? reject(error) : resolve(key),
    );
  });

const isPositiveInteger = (value: number) =>
  Number.isSafeInteger(value) && value > 0;

// Formato guardado: scrypt$N$r$p$sal$hash (sal y hash en base64url). Guardar el
// costo junto al hash permite subirlo más adelante sin invalidar contraseñas.
export function createScryptPasswordHasher(
  cost: ScryptCost = DEFAULT_SCRYPT_COST,
): PasswordHasher {
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
      if (![stored.N, stored.r, stored.p].every(isPositiveInteger)) return false;
      const expected = Buffer.from(hash, "base64url");
      if (expected.length !== KEY_LENGTH) return false;
      const key = await derive(password, Buffer.from(salt, "base64url"), KEY_LENGTH, stored);
      return timingSafeEqual(key, expected);
    },
  };
}
