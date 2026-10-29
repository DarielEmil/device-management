# Device Management

Aplicación web para gestionar el inventario de equipos, sus préstamos y devoluciones, y las cuentas y empleados de una organización. La interfaz está en español y está orientada principalmente a escritorio.

## Funcionalidades

- **Inventario:** consulta, búsqueda, filtros y registro de equipos.
- **Préstamos:** asignación de equipos disponibles, seguimiento de fechas y registro de devoluciones. Los estados «por vencer» y «atrasado» se calculan a partir de la fecha.
- **Usuarios y empleados:** registro de empleados, invitación y desactivación de cuentas, y vinculación de cuentas con empleados.
- **Acceso por roles:** el encargado administra el inventario, los préstamos y los usuarios; el empleado consulta los equipos disponibles y sus propios préstamos.
- **Dashboard:** indicadores y actividad según el rol de la cuenta.

## Tecnologías

| Componente | Tecnologías |
| --- | --- |
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS 4 |
| Backend | Node.js 22, Express 5, TypeScript, Prisma 7 |
| Base de datos | MySQL 8.4 |
| Pruebas | Vitest, Supertest y Playwright |

## Requisitos

- Node.js 22 y npm.
- Docker y Docker Compose para ejecutar MySQL con la configuración incluida.
- Puertos locales `3000`, `8080` y `3306` disponibles, salvo que se cambie la configuración correspondiente.

## Instalación y ejecución

Los siguientes comandos parten de la raíz del repositorio. El backend y el frontend se ejecutan en terminales separadas.

### 1. Configurar y arrancar el backend

```bash
cd backend
cp .env.example .env
```

Edita `backend/.env`: define las credenciales de MySQL y asegúrate de que `DATABASE_URL` contenga el mismo usuario, contraseña, puerto y nombre de base de datos que las variables `MYSQL_*`. Por ejemplo, si conservas `MYSQL_DATABASE=device_management`, el nombre al final de la URL debe ser `device_management`, no el marcador `MYSQL_DATABASE` del ejemplo.

```bash
npm ci
docker compose up -d
docker compose ps
```

Cuando MySQL aparezca como `healthy`, ejecuta las migraciones, carga los datos de demostración y arranca la API:

```bash
npm run prisma:migrate
npm run prisma:seed
npm run dev
```

La API estará disponible en `http://devices.localhost:8080/api`; puedes comprobarla en `http://devices.localhost:8080/api/health`. El seed solo carga datos si la base no contiene usuarios.

### 2. Configurar y arrancar el frontend

En otra terminal, desde la raíz:

```bash
cd frontend
cp .env.example .env.local
npm ci
npm run dev
```

Abre **http://devices.localhost:3000**. El archivo de ejemplo configura `NEXT_PUBLIC_APP_ENV=staging`, que conecta el frontend con la API local. Mantén `devices.localhost` como host tanto para el frontend como para la API: la cookie de sesión no funciona correctamente si se mezclan hosts como `localhost` y `127.0.0.1`. Si cambias el origen del frontend, actualiza también `CORS_ORIGIN` en el backend.

### Cuentas de demostración

Disponibles en el modo simulado y, tras ejecutar el seed, en una base de datos vacía:

| Rol | Correo | Contraseña |
| --- | --- | --- |
| Encargado | `laura.mendez@empresa.com` | `Demo2026!` |
| Empleado | `ana.garcia@empresa.com` | `Demo2026!` |

Estas credenciales son únicamente para desarrollo; no las uses en producción.

### Modo de demostración sin backend

Para ejecutar solo la interfaz, cambia `NEXT_PUBLIC_APP_ENV` a `local` en `frontend/.env.local` y ejecuta `npm run dev` desde `frontend/`. También puedes omitir `.env.local`: en desarrollo se utilizan mocks por defecto. Los datos y la sesión simulados viven en memoria y se reinician al recargar la página. Reinicia el servidor de desarrollo después de cambiar las variables de entorno.

## Variables de entorno

Los archivos de ejemplo contienen la configuración completa: [`backend/.env.example`](backend/.env.example) y [`frontend/.env.example`](frontend/.env.example).

| Variable | Descripción |
| --- | --- |
| `DATABASE_URL` | URL de conexión MySQL utilizada por Prisma y el backend. |
| `MYSQL_*` | Credenciales, base de datos y puerto para el contenedor MySQL. |
| `PORT` | Puerto HTTP del backend. |
| `CORS_ORIGIN` | Origen permitido del frontend; también se usa para proteger solicitudes contra CSRF. |
| `COOKIE_SECURE` | Controla el atributo `Secure` de la cookie de sesión. |
| `NEXT_PUBLIC_APP_ENV` | `local` o `dev` usan mocks; `staging` o `production` usan HTTP. |
| `NEXT_PUBLIC_API_BASE_URL` | URL base de la API, incluido `/api`. |
| `NEXT_PUBLIC_MOCK_*` | Fecha, escenario y latencia para el modo simulado. |

Las variables `NEXT_PUBLIC_*` se exponen al navegador y se incorporan al compilar: no deben contener secretos.

## Pruebas y validación

Ejecuta los comandos desde la carpeta indicada:

```bash
# backend/
npm run check              # lint, tipos y pruebas unitarias
npm run test:integration   # pruebas con MySQL
npm run build
```

Las pruebas de integración requieren MySQL y utilizan una base de prueba separada, con el sufijo `_test`.

```bash
# frontend/
npm run check              # lint, tipos y pruebas unitarias
npm run build
npx playwright install chromium
npm run test:e2e           # pruebas de navegador con mocks
```

## Estructura del repositorio

```text
backend/    API, lógica de negocio, acceso a datos, migraciones y pruebas
frontend/   Interfaz Next.js, lógica de cliente, adaptadores HTTP y mocks
```

La API está organizada en capas de presentación, negocio y persistencia. El frontend separa interfaz, negocio y adaptadores para poder intercambiar la API real por mocks.

## Notas y documentación

- El backend gestiona sesiones mediante cookies y aplica permisos por rol. Las invitaciones y la recuperación de contraseña todavía no cuentan con proveedor de correo: las notificaciones se registran en el log.
- [`backend/README.md`](backend/README.md) detalla la API, las reglas de negocio, la base de datos y la seguridad.
- [`frontend/README.md`](frontend/README.md) documenta las pantallas, los mocks y las pruebas. Algunas referencias allí a un backend futuro están desactualizadas: el backend ya está incluido en este repositorio.
- `docker compose down`, ejecutado desde `backend/`, detiene los contenedores sin borrar el volumen de datos.
