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
  config/        Configuración y variables de entorno
  app.ts         Express (CORS, JSON, router)
  server.ts      Arranque
```

ESLint (`eslint.config.mts`) hace cumplir las dependencias: negocio no importa presentación, DB ni Express; presentación no importa DB; DB no importa HTTP ni casos de uso.

## Estado

Solo arranca el servidor con `GET /api/health`. Las carpetas de cada capa están vacías (`.gitkeep`) y se llenan al agregar funcionalidad: casos de uso CU-01 a CU-06, autenticación por sesión y RBAC, y el repositorio de DB cuando se elija el motor (pendiente en `Diagrama ER`).
