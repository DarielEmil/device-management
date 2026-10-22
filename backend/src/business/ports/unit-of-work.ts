import type { Repositories } from "./repositories.js";

// Puerto transaccional. Las operaciones que cambian más de una fila
// (préstamo + estado del equipo, devolución, alta de cuenta + sesión, baja de
// cuenta + empleado + sesiones) se ejecutan dentro de `transaction`.
export interface UnitOfWork {
  // Repositorios fuera de transacción: lecturas y escrituras de un solo paso.
  readonly repositories: Repositories;
  // Ejecuta `work` en una transacción con sus propios repositorios. Si `work`
  // lanza, se revierte todo lo escrito y el error se propaga.
  transaction<T>(work: (repositories: Repositories) => Promise<T>): Promise<T>;
}
