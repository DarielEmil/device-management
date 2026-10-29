import type { Prisma } from "../generated/prisma/client.js";

// Cliente raíz o el de una transacción: los repositorios no distinguen.
export type Db = Prisma.TransactionClient;
