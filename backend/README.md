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

## Arquitectura por capas

Según `Arquitectura.md`: cada capa solo conoce a la inmediata inferior y las dependencias van siempre hacia abajo.

```text
src/
  presentation/  Rutas, controladores, DTOs (zod) y middleware. Sin reglas de negocio ni queries
    routes/ controllers/ dto/ middleware/
  business/      Entidades, reglas, casos de uso y ports (contratos). Sin HTTP ni SQL
    entities/ rules/ use-cases/ ports/
  db/            Adaptadores que implementan los ports (repositorios)
    repositories/
  config/        Variables de entorno validadas
  container.ts   Composición: único lugar que conoce las tres capas
  app.ts         Express (CORS, JSON, router, errores)
  server.ts      Arranque
```

ESLint (`eslint.config.mts`) hace cumplir las dependencias: negocio no importa presentación, DB ni Express; presentación no importa DB; DB no importa HTTP ni casos de uso.

## Estado

Incluido: `GET /api/health`, `GET /api/equipment?status=` (CU-05), `POST /api/equipment` (CU-01), formato de error uniforme `{ error: { code, message, fields } }` y UUID v7 generado en negocio.

Los repositorios son **en memoria** porque el motor de DB sigue pendiente (ver `Diagrama ER`). Al elegirlo, solo se reemplaza el adaptador en `db/` y `container.ts`; negocio no cambia.

Pendiente (siguientes PRs): autenticación por sesión y RBAC (`/auth/*`), empleados (CU-02), préstamos (CU-03, CU-04, CU-06), cuentas/invitaciones y migraciones. **Hasta que exista auth, los endpoints no están protegidos.**
