# Device Management — Backend

API REST del monolito. **Node.js 22, Express 5 y TypeScript estricto.** Convive con `../frontend` en el mismo repositorio y sirve en `http://localhost:8080/api`, la URL que el frontend espera en `NEXT_PUBLIC_API_BASE_URL`.

## Ejecutar en local

```sh
npm ci
cp .env.example .env
npm run dev      # tsx watch
npm run check    # lint + typecheck + tests
npm run build && npm start
```

### Base de datos (MySQL 8.4.13 + Prisma 7)

`docker-compose.yml` levanta MySQL y usa el mismo `.env` que el backend. Desde `backend/`:

```sh
cp .env.example .env          # cambiar contraseñas; DATABASE_URL debe coincidir con MYSQL_*
docker compose up -d          # esperar a "healthy" con: docker compose ps
npm run prisma:migrate        # aplica las migraciones (prisma migrate dev)
npm run prisma:seed           # datos demo del frontend; contraseña Demo2026!
npm run test:integration      # tests contra MySQL, en la base <MYSQL_DATABASE>_test
```

| Script | Qué hace |
| --- | --- |
| `prisma:generate` | Genera el cliente en `src/db/generated/` (también corre en `postinstall`; no se versiona) |
| `prisma:migrate` | `prisma migrate dev`: aplica migraciones y crea nuevas a partir de `prisma/schema.prisma` |
| `prisma:deploy` | `prisma migrate deploy`: solo aplica las pendientes (CI y producción) |
| `prisma:seed` | Siembra una base vacía (`prisma/seed.ts`); si ya hay usuarios no hace nada |
| `prisma:reset` | Borra la base, reaplica las migraciones y siembra |
| `prisma:studio` | Explorador web de los datos |

- La primera vez que se crea el volumen, MySQL crea la base y el usuario, y ejecuta `database/init/01-grants.sh`: crea `<MYSQL_DATABASE>_test` y da permisos sobre ella y sobre las shadow databases de `prisma migrate dev`. Si el volumen ya existía sin ese script, `docker compose down -v` y volver a levantar.
- `docker compose down` conserva los datos; `down -v` borra el volumen.

#### Decisiones del esquema

- **Nombres** en inglés y snake_case (`@@map`/`@map`). Los valores de estado y rol se guardan en español (`Disponible`, `Prestado`, `Activo`, `Devuelto`, `Encargado`, `Empleado`, `Inactivo`, `Invitado`); los repositorios los traducen a las claves en inglés de negocio (`db/mappers.ts`).
- **PK:** UUID v7 generado por Prisma Client al insertar (`@default(uuid(7))`), guardado como `CHAR(36)`. Los `insert` de los repositorios reciben el registro sin `id` (`NewRecord<T>`) y devuelven el creado; negocio no genera ids. Se eligió sobre `BINARY(16)` porque se lee en consultas y logs sin conversiones y Prisma lo maneja como `String`; el costo es más espacio por índice. `sessions.id` es el SHA-256 en hex del token (`VARCHAR(64)`).
- **Fechas:** `DATETIME(3)` en lugar de `TIMESTAMP` (que se desborda en 2038); `DATE` para las fechas de préstamo.
- **Diferencias con el ER v0.4**, porque negocio las necesita:
  - `users` tiene `name` y `status` (`Activo`/`Inactivo`/`Invitado`) en lugar de `is_active`, y `password_hash` admite NULL mientras la cuenta está `Invitado`.
  - `loans` tiene `created_at` para ordenar la actividad reciente.
  - `employees.department` es NOT NULL (negocio siempre lo exige).
- **Un solo préstamo activo por equipo:** MySQL no tiene índices únicos parciales, así que la migración crea la columna generada `active_device_id` (= `device_id` mientras el préstamo está `Activo`, si no NULL) con el índice único `ux_loans_device_active`. Está declarada en `schema.prisma` solo para que Prisma no la borre; nunca se escribe. Además, negocio bloquea la fila del equipo (`SELECT … FOR UPDATE`) dentro de la transacción.
- **CHECK** (SQL manual en la migración inicial, Prisma no los modela): catálogos de estados y roles, `expected_return_date >= loan_date`, `actual_return_date >= loan_date` y `status = 'Devuelto'` ⇔ `actual_return_date IS NOT NULL`.
- **Borrado:** las FK de `loans` y `users` son `RESTRICT` (baja lógica); solo `sessions → users` es `CASCADE`.
- **Transacciones:** `createPrismaUnitOfWork` usa `prisma.$transaction` con `READ COMMITTED`, para que después de un `FOR UPDATE` las lecturas vean lo último confirmado.
- **Errores:** una violación de índice único se traduce a `DomainError CONFLICT` con el mismo campo y mensaje que usa negocio (`db/errors.ts`).

## Arquitectura por capas

Según `Arquitectura.md`: cada capa solo conoce a la inmediata inferior y las dependencias van siempre hacia abajo.

```text
src/
  presentation/  Rutas, controladores, DTOs (zod) y middleware. Sin reglas de negocio ni queries
    routes/ controllers/ dto/ middleware/
  business/      Entidades, reglas, casos de uso y ports (contratos). Sin HTTP ni SQL
    entities/ rules/ use-cases/ ports/
  db/            Prisma: cliente, unit of work y repositorios que implementan los ports
    repositories/ generated/ (cliente generado, no versionado)
  config/        Configuración y variables de entorno
  app.ts         Express (CORS, JSON, router)
  server.ts      Arranque
```

ESLint (`eslint.config.mts`) hace cumplir las dependencias: negocio no importa presentación, DB, Express ni Prisma; presentación no importa DB ni Prisma; DB no importa HTTP ni casos de uso.

## Estado

- **Negocio (`src/business/`, issue #5): completo y probado con repositorios falsos.** Todavía no está conectado a HTTP ni a una base de datos.
- **Presentación (issue #6):** solo existe `GET /api/health`.
- **DB (issue #4):** esquema, migración, seed y repositorios con Prisma y MySQL, probados contra MySQL (`npm run test:integration`). Falta conectarlos en la composición (`createPrismaClient` + `createPrismaUnitOfWork`), junto con presentación.

## Lógica de negocio

`createUseCases(deps)` (`business/use-cases/index.ts`) devuelve todos los casos de uso. Las dependencias se inyectan: `UnitOfWork` (repositorios y transacciones), `Clock`, `PasswordHasher` y `AccountNotifier`. Cada caso de uso protegido recibe primero el `Actor` (usuario, rol y empleado vinculado), que presentación obtiene con `auth.getCurrentSession(token)`.

| Módulo | Casos de uso | Rol |
| --- | --- | --- |
| `equipment` | `registerEquipment` (CU-01), `listAvailableEquipment` (CU-05), `listEquipment` | Registrar: Encargado. Consultar: ambos; el Empleado solo ve los disponibles |
| `employees` | `registerEmployee` (CU-02), `listEmployees` | Encargado |
| `loans` | `createLoan` (CU-03), `returnLoan` (CU-04), `listLoans` (CU-06) | Registrar y devolver: Encargado. Consultar: ambos; el Empleado solo ve los suyos |
| `auth` | `register`, `login`, `logout`, `getCurrentSession`, `requestPasswordRecovery` | Público |
| `accounts` | `listAccounts`, `inviteAccount`, `deactivateAccount` | Encargado |
| `dashboard` | `getDashboard` | Ambos; el Empleado sin indicadores del inventario |

Reglas principales:

- **Errores:** `DomainError` con código `VALIDATION`, `CONFLICT`, `NOT_FOUND`, `UNAUTHENTICATED` o `FORBIDDEN`. El mensaje y `fields` están en español, con las mismas claves y textos que usa el frontend.
- **Identificadores:** UUID v7 generados por Prisma al insertar (ver "Decisiones del esquema"). Los fakes en memoria usan `randomUUID()`.
- **Equipos:** el código se guarda en mayúsculas. El tipo se normaliza al catálogo del frontend (`Laptop`, `Monitor`, `Periférico`, `Tablet`) sin distinguir mayúsculas ni tildes; un tipo fuera del catálogo es un error de validación.
- **Préstamos:**
  - Estados guardados: `Activo` → `Devuelto`. `Por vencer` (0 a 3 días) y `Atrasado` se calculan con la fecha de hoy en `America/Santo_Domingo`.
  - Crear un préstamo y devolverlo son transacciones. Al crear se bloquea la fila del equipo (`findByIdForUpdate`) y se verifica que no tenga otro préstamo activo.
- **Sesiones:**
  - Token aleatorio de 256 bits; en la base de datos solo se guarda su hash SHA-256.
  - El login invalida la sesión previa del navegador (regeneración del id).
  - Contraseñas con scrypt (parámetros de OWASP). Mismo error y mismo costo para correo inexistente, contraseña incorrecta o cuenta no activa.
- **Cuentas:**
  - Invitar crea una cuenta `Invitado` sin contraseña.
  - Desactivar es una baja lógica: la cuenta pasa a `Inactivo`, su empleado se desactiva y sus sesiones se cierran. Sus préstamos activos se conservan (se devuelven con CU-04) y ya no puede recibir préstamos nuevos. No se puede desactivar la propia cuenta.

### Decisiones abiertas del issue #5 y valor tomado

| Decisión | Valor actual | Dónde cambiarlo |
| --- | --- | --- |
| Duración de la sesión | 30 min de inactividad, tope de 12 h | `DEFAULT_SESSION_POLICY` o `sessionPolicy` en `createUseCases` |
| ¿Todo empleado tiene cuenta? | No. Una cuenta puede no tener empleado y viceversa | — |
| ¿El Empleado solo ve sus préstamos? | Sí, como el frontend | `loanScope` en `use-cases/loans.ts` |
| ¿Estado "Vencido"? | No. Se usa `Atrasado`, derivado, como el frontend | `rules/loans.ts` |
| Recuperación de contraseña | Solo avisa por `AccountNotifier`. Falta definir el proveedor de correo y dónde guardar el token de recuperación | — |

### Tests

`npm test` corre los tests de `tests/unit/` con vitest. Usan los ports falsos de `tests/support/in-memory.ts`, que aplican las restricciones únicas, serializan las transacciones y revierten si una falla. Así se prueban la atomicidad y los préstamos simultáneos sin base de datos.
