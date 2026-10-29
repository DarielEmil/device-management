import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "./generated/prisma/client.js";

export type { PrismaClient } from "./generated/prisma/client.js";

// Un solo PrismaClient por proceso: lo crea la composición y lo comparten
// todos los repositorios. Acepta la misma DATABASE_URL (mysql://) que Prisma CLI.
export function createPrismaClient(databaseUrl: string): PrismaClient {
  const url = new URL(databaseUrl);
  const adapter = new PrismaMariaDb({
    host: url.hostname,
    port: url.port ? Number(url.port) : 3306,
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: url.pathname.slice(1),
    // MySQL 8 autentica con caching_sha2_password; sin TLS necesita la clave pública.
    allowPublicKeyRetrieval: true,
    connectionLimit: Number(url.searchParams.get("connection_limit") ?? 10),
  });
  return new PrismaClient({ adapter });
}
