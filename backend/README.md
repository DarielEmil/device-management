# Device Management — Backend

API REST del monolito. **Node.js 22, Express 5 y TypeScript estricto.** Convive con `../frontend` en el mismo repositorio y sirve en `http://devices.localhost:8080/api`, la URL de `NEXT_PUBLIC_API_BASE_URL` en `frontend/.env.example` (ver "Cookie de sesión": front y API deben estar en el mismo host).

## Ejecutar en local

```sh
npm ci
cp .env.example .env
docker compose up -d && npm run prisma:migrate && npm run prisma:seed   # ver "Base de datos"
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

## API HTTP

Rutas, cuerpos y errores siguen el contrato del frontend (`frontend/src/api/`), no las rutas en español de `Arquitectura` §5.2. Toda respuesta con datos usa el sobre `{ data: ... }`; los errores, `{ message, fields }` con los mensajes en español de negocio.

| Método y ruta | Caso de uso | Rol | Respuesta |
| --- | --- | --- | --- |
| `GET /api/health` | — | público | `200 { data: { status } }` |
| `POST /api/auth/register` | `auth.register` | público | `201 { data: { account } }` + cookie |
| `POST /api/auth/login` | `auth.login` | público | `200 { data: { account } }` + cookie |
| `POST /api/auth/logout` | `auth.logout` | público | `204`, borra la cookie y la sesión |
| `GET /api/auth/session` | `auth.getCurrentSession` | sesión | `200 { data: { account } }` o `401` |
| `POST /api/auth/recover` | `auth.requestPasswordRecovery` | público | `204` exista o no el correo |
| `GET /api/equipment?status=` | `equipment.listEquipment` | ambos | `200 { data: Equipment[] }` |
| `POST /api/equipment` | CU-01 `registerEquipment` | Encargado | `201 { data: Equipment }` |
| `GET /api/employees` | `employees.listEmployees` | Encargado | `200 { data: Employee[] }` |
| `POST /api/employees` | CU-02 `registerEmployee` | Encargado | `201 { data: Employee }` |
| `GET /api/loans?status=&employeeId=` | CU-06 `listLoans` | ambos | `200 { data: Loan[] }` |
| `POST /api/loans` | CU-03 `createLoan` | Encargado | `201 { data: Loan }` |
| `POST /api/loans/:id/return` | CU-04 `returnLoan` | Encargado | `200 { data: Loan }` |
| `GET /api/accounts` | `accounts.listAccounts` | Encargado | `200 { data: Account[] }` |
| `POST /api/invitations` | `accounts.inviteAccount` | Encargado | `201 { data: Account }` |
| `POST /api/accounts/:id/deactivate` | `accounts.deactivateAccount` | Encargado | `200 { data: Account }` |
| `GET /api/dashboard` | `dashboard.getDashboard` | ambos | `200 { data: Dashboard }` |

- **Salida:** mappers explícitos en `presentation/dto/output.dto.ts` (`Equipment`, `Employee`, `Account`, `Loan`, `Session = { account }`, `Dashboard`); nunca salen `passwordHash`, `createdAt` ni los ids de quien registró. `Loan.status` es el estado mostrado (`active`, `due_soon`, `overdue`, `returned`).
- **Entrada:** los DTOs zod (`presentation/dto/input.dto.ts`) solo validan tipos. Un campo ausente llega como `""` a negocio, que devuelve el mensaje del campo. `?status=` admite los mismos valores en inglés del contrato.
- **Permisos:** presentación solo exige sesión (`requireSession`) y pasa el `Actor`; el rol lo decide negocio con `authorize`.

| Error | HTTP |
| --- | --- |
| `DomainError` `VALIDATION`, JSON inválido, cuerpo que no es objeto o tipos incorrectos | 422 |
| `CONFLICT` | 409 |
| `NOT_FOUND`, ruta desconocida | 404 |
| `UNAUTHENTICATED` (sin sesión, vencida o cuenta inactiva) | 401 |
| `FORBIDDEN` (rol), `POST` desde un origen no permitido | 403 |
| `POST` con cuerpo que no es `application/json` | 415 |
| Cuerpo de más de 100 kB | 413 |
| Cualquier otro | 500 con mensaje genérico; el detalle solo en el log |

### Cookie de sesión

- `dm_session`, `HttpOnly`, `SameSite=Lax`, `Path=/api`; `Secure` según `COOKIE_SECURE`. Su valor es el token; en la base solo está su SHA-256.
- `Expires` = `session.expiresAt`. Cada petición autenticada reenvía la cookie con la expiración vigente, así que se renueva cuando negocio la desliza (30 min de inactividad, tope de 12 h).
- Login y registro reciben la cookie anterior (`currentToken`) y negocio borra esa sesión antes de abrir otra. Logout borra la sesión y la cookie. Una sesión vencida o de una cuenta inactiva responde 401 y también borra la cookie.
- **Mismo host para front y API:** el navegador compara los hosts como texto (`127.0.0.1` y `localhost` son sitios distintos) y con `SameSite=Lax` la cookie no viaja entre sitios. Por eso los dos usan `devices.localhost`: el frontend en `http://devices.localhost:3000` (`next dev --hostname devices.localhost`) con `NEXT_PUBLIC_API_BASE_URL=http://devices.localhost:8080/api`, y el backend con `CORS_ORIGIN=http://devices.localhost:3000`. Los navegadores y Node resuelven `*.localhost` a la propia máquina sin configuración.

### CSRF

El frontend no envía token CSRF. `originGuard` (`presentation/middleware/origin.middleware.ts`) acepta un método que modifica datos (todo lo que no es `GET`/`HEAD`/`OPTIONS`) solo si el `Origin` (o, si falta, el `Referer`) está en `CORS_ORIGIN`, y, si trae cuerpo, solo con `Content-Type: application/json`. Un formulario de otro sitio no puede enviar JSON sin preflight de CORS, y CORS solo responde con credenciales a `CORS_ORIGIN`. Junto con `SameSite=Lax` cubre el riesgo sin cambiar el frontend.

### Variables de entorno

`config/env.ts` las valida al arrancar y, si falta alguna o es inválida, el proceso termina listando todos los problemas.

| Variable | Obligatoria | Uso |
| --- | --- | --- |
| `NODE_ENV` | sí | `development`, `test` o `production` |
| `PORT` | sí | Puerto HTTP (8080) |
| `CORS_ORIGIN` | sí | Origen del frontend, o varios separados por comas; CORS y CSRF usan la misma lista |
| `DATABASE_URL` | sí | `mysql://…` (la misma de Prisma CLI) |
| `COOKIE_SECURE` | no | `true`/`false`; vacía: `false` en `development`, `true` en el resto |

### Composición

`container.ts` arma un solo `PrismaClient`, `createPrismaUnitOfWork`, `createSystemClock`, `createScryptPasswordHasher` y un `AccountNotifier` que solo escribe en el log (todavía no hay proveedor de correo). `app.ts` recibe los casos de uso ya construidos, así los tests HTTP usan los fakes en memoria. `server.ts` carga `.env`, valida la configuración, arranca y cierra Prisma con `SIGINT`/`SIGTERM`.

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
  config/        Configuración y variables de entorno (env.ts)
  container.ts   Composición: conecta DB, negocio y presentación
  app.ts         Express (CORS, CSRF, cookies, JSON, router, errores)
  server.ts      Arranque
```

ESLint (`eslint.config.mts`) hace cumplir las dependencias: negocio no importa presentación, DB, Express ni Prisma; presentación no importa DB ni Prisma; DB no importa HTTP ni casos de uso.

## Estado

- **Negocio (`src/business/`, issue #5): completo y probado con repositorios falsos.**
- **Presentación (`src/presentation/`, issue #6): completa.** Todos los endpoints del contrato del frontend, cookie de sesión, CSRF por origen y manejo de errores, probados con supertest.
- **DB (issue #4):** esquema, migración, seed y repositorios con Prisma y MySQL, probados contra MySQL (`npm run test:integration`).
- **Composición (`container.ts`):** las tres capas conectadas. Desbloquea el frontend en modo HTTP (`NEXT_PUBLIC_APP_ENV=staging`).
- **Pendiente:** proveedor de correo para invitaciones y recuperación de contraseña (hoy solo se registran en el log).

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

- `tests/unit/http-*.test.ts`: la app Express con supertest sobre esos fakes (auth y cookie, RBAC, errores, CSRF, préstamo y devolución, cuentas, dashboard). Validan las respuestas con una copia de los esquemas del frontend (`tests/support/frontend-contract.ts`); si el contrato cambia en `frontend/src/business/entities/models.ts`, hay que actualizarla.
- `tests/integration/http.test.ts`: humo contra MySQL con la composición real (`createContainer`): login, listar equipos, prestar, devolver y logout.
