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

// Límites del costo aceptado. Dejan margen para subir el costo por defecto
// (128 MiB) sin permitir que un hash guardado pida memoria o CPU sin control.
const MAX_SCRYPT_MEMORY = 256 * 1024 * 1024; // bytes que usa scrypt: 128·N·r
const MAX_SCRYPT_P = 4;

const isPositiveInteger = (value: number) =>
  Number.isSafeInteger(value) && value > 0;

// Node exige que N sea potencia de 2 mayor que 1; con otro valor scrypt lanza
// ERR_CRYPTO_INVALID_SCRYPT_PARAMS. El tope de memoria va primero: acota N
// antes de usar operadores de bits, que en JS trabajan con 32 bits.
export const isSupportedScryptCost = ({ N, r, p }: ScryptCost): boolean =>
  [N, r, p].every(isPositiveInteger) &&
  128 * N * r <= MAX_SCRYPT_MEMORY &&
  p <= MAX_SCRYPT_P &&
  N > 1 &&
  (N & (N - 1)) === 0;

// Formato guardado: scrypt$N$r$p$sal$hash (sal y hash en base64url). Guardar el
// costo junto al hash permite subirlo más adelante sin invalidar contraseñas.
export function createScryptPasswordHasher(
  cost: ScryptCost = DEFAULT_SCRYPT_COST,
): PasswordHasher {
  // Si el costo configurado no fuera válido, verify rechazaría los propios
  // hashes de la app; mejor fallar al arrancar.
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
        // Un hash guardado que scrypt no acepta es una credencial inválida, no
        // un error del servidor: el login debe responder 401, no 500.
        return false;
      }
      return timingSafeEqual(key, expected);
    },
  };
}
