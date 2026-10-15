# Device Management

Frontend desktop para inventario de equipos y préstamos. **Next.js 16, React 19, TypeScript estricto y Tailwind CSS 4.** Sin backend, base de datos ni SQLite.

## Ejecutar en local

Requisitos: Node.js 22 LTS y npm. Desde la raíz:

```sh
npm ci
cp .env.example .env.local
npm run dev
```

Abrir **http://127.0.0.1:3000**. `next dev` también selecciona mocks por defecto si no existe `.env.local`.

| Cuenta demo | Correo                     | Contraseña  |
| ----------- | -------------------------- | ----------- |
| Encargado   | `laura.mendez@empresa.com` | `Demo2026!` |
| Empleado    | `ana.garcia@empresa.com`   | `Demo2026!` |

En login hay botones para completar estas credenciales, no para cambiar roles arbitrariamente. Los datos y la sesión viven **solo en memoria**: una recarga completa reinicia ambos. La navegación interna y cerrar/iniciar sesión conservan los cambios durante la misma ejecución. No se guardan contraseñas en localStorage ni cookies simuladas.

## Arquitectura por capas

```text
src/
  app/        Rutas, layouts, CSS global y composición de dependencias
  ui/         Pantallas, componentes, hooks y estado visual
  business/   Entidades, reglas, validación, casos de uso y contratos (ports)
  api/        Configuración, cliente HTTP, DTO, mappers y adaptadores reales
  mocks/      Datos, adaptadores simulados y escenarios
```

La UI llama casos de uso por contexto; **no importa APIs ni mocks ni realiza peticiones HTTP**. Negocio depende de sus propios contratos, no de React/Next/HTTP. Las implementaciones HTTP y mock satisfacen `Gateways`. `src/app/providers.tsx` compone todo; `src/api/index.ts` decide cuál usar mediante un único condicional. ESLint controla estas dependencias, incluido el uso de Axios fuera de UI y negocio. Todos los archivos de aplicación son `.ts`/`.tsx`; PostCSS usa configuración JSON.

### Nombres y rutas

Archivos y carpetas usan nombres en inglés; la interfaz permanece en español. `src/app/(authenticated)/` agrupa las pantallas con sesión y sidebar, sin agregar un segmento a la URL.

| Pantalla | Ruta |
| --- | --- |
| Login | `/login` |
| Registro | `/register` |
| Recuperación de contraseña | `/forgot-password` |
| Dashboard | `/dashboard` |
| Inventario | `/inventory` |
| Préstamos | `/loans` |
| Usuarios | `/users?tab=accounts` / `/users?tab=employees` |
| Equipos disponibles | `/available-equipment` |
| Mis préstamos | `/my-loans` |

Los enlaces a listas filtradas utilizan el parámetro `status`. Las URLs anteriores en español ya no son rutas de la aplicación.

## Entornos y mocks

| Variable                    | Valores / comportamiento                                                                    |
| --------------------------- | ------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_APP_ENV`       | `local` / `dev`: mocks. `staging` / `production`: HTTP                                      |
| `NEXT_PUBLIC_API_BASE_URL`  | URL del futuro backend, incluida la ruta base, por ejemplo `https://api.empresa.com/api`    |
| `NEXT_PUBLIC_MOCK_TODAY`    | Fecha de referencia de la demo. Por defecto `2026-10-07`; valor vacío para fecha real local |
| `NEXT_PUBLIC_MOCK_DELAY_MS` | Latencia simulada; por defecto 350 ms                                                       |
| `NEXT_PUBLIC_MOCK_SCENARIO` | `default`, `empty`, `no-active-loans`, `error` o `unavailable`                              |

Sin entorno explícito, `next dev` usa `dev`; `next build` usa `production`. Un entorno desconocido falla explícitamente. **No existe fallback a mocks cuando HTTP falla.** Las variables `NEXT_PUBLIC_*` son públicas y se fijan al compilar: nunca deben contener secretos. Reiniciar dev o recompilar después de cambiarlas.

Escenarios:

- `default`: los 10 equipos, 6 empleados, 7 cuentas y 6 préstamos definidos en el plan.
- `empty`: sin equipos ni préstamos; mantiene las cuentas de prueba.
- `no-active-loans`: solo préstamos devueltos y todos los equipos disponibles.
- `error`: login funciona, pero las consultas fallan para probar carga/error/reintento.
- `unavailable`: el selector muestra equipos disponibles y la confirmación simula un conflicto.

Los mocks soportan registros, duplicados, préstamos, devolución, invitación y desactivación. No envían correos ni implementan activación de invitaciones. Las invitaciones quedan `Invitado`; recuperación muestra feedback de simulación. El registro público siempre crea una cuenta `Empleado` sin vínculo automático a otra persona. No hay edición de vínculos de cuentas existentes en este alcance.

Los indicadores se calculan con los registros existentes, no con los totales ilustrativos 128/83/45/7. Teléfono es opcional, siguiendo el caso de error detallado del plan. El diseño usa los colores exactos y tipografía de Stitch, sidebar 232 px, escritorio de referencia 1440 px y tablas con scroll en ventanas estrechas; no incluye layouts mobile.

## Funcionalidades

- Dashboard por rol; sin KPIs administrativos para empleados.
- Inventario: filtros, búsqueda, paginación, registro y préstamo desde una fila disponible.
- Usuarios: pestañas Cuentas / Empleados, registro, invitación simulada y desactivación.
- Préstamos: Activos / Devueltos / Todos, filtros, creación y devolución confirmada.
- Empleado: solo catálogo disponible y préstamos propios.
- Errores inline, formularios tipados, estados vacíos, skeletons, foco visible, modales con Escape y foco contenido, y selectores buscables por teclado.
- `Por vencer` (0–3 días) y `Atrasado` se calculan, no se almacenan como estados.

**Los guards y permisos del frontend son de experiencia de usuario, no seguridad real.** El backend futuro debe autenticar, autorizar, filtrar datos por usuario, proteger CSRF/CORS y hacer atómicos los préstamos/devoluciones y las restricciones únicas. El mock también valida al confirmar para simular conflictos dentro de una pestaña, no concurrencia entre servidores/pestañas.

## Contrato previsto para conectar un backend

Todavía **no hay backend**. Los adaptadores HTTP son una propuesta de contrato centralizada en `src/api`, no endpoints verificados contra un servicio existente. Usan un cliente **Axios** con `withCredentials: true`, JSON, timeout de 15 s y respuesta `{ "data": ... }` validada con Zod.

| Método     | Endpoint                        | Contenido de `data`                                       |
| ---------- | ------------------------------- | --------------------------------------------------------- |
| GET        | `/auth/session`                 | `{ account: Account }` o `null`; 401 significa sin sesión |
| POST       | `/auth/login`, `/auth/register` | `{ account: Account }`                                    |
| POST       | `/auth/logout`, `/auth/recover` | 204 o JSON                                                |
| GET / POST | `/equipment`                    | `Equipment[]` / `Equipment`                               |
| GET / POST | `/employees`                    | `Employee[]` / `Employee`                                 |
| GET / POST | `/loans`                        | `Loan[]` / `Loan`                                         |
| POST       | `/loans/:id/return`             | `Loan`                                                    |
| GET        | `/accounts`                     | `Account[]`                                               |
| POST       | `/invitations`                  | `Account` con estado Invitado                             |
| POST       | `/accounts/:id/deactivate`      | `Account`                                                 |

Entidades y formularios: `src/business/entities/models.ts` y `src/business/rules/validation.ts`. Un préstamo incluye `equipmentCode`, `equipmentName` y `employeeName` para no requerir acceso al inventario administrativo. El backend debe devolver estas relaciones con el préstamo. Para Empleado, `GET /equipment` solo devuelve disponibles y `GET /loans` solo préstamos propios; no se consulta `/accounts` ni `/employees`.

Errores HTTP: `{ "message": "...", "fields": { "code": "..." } }` con status no exitoso. Cuando el backend defina otro formato, adaptar DTO/mappers/repositorios sin cambiar negocio ni UI.

## Validación

```sh
npm run check          # ESLint + TypeScript + tests unitarios
npm run build          # Compilación de producción
npx playwright install chromium
npm run test:e2e       # Levanta su propio servidor mock en 127.0.0.1:3100
```

Playwright verifica login, registro, inventario, duplicados, préstamos, devoluciones, empleados, invitaciones, desactivación, permisos y teclado. Capturas en `test-results/`, informe en `playwright-report/`.

Para ejecutar un build de demo con `npm start`, compilar con `NEXT_PUBLIC_APP_ENV=local` (o `.env.local`). Para integración real, compilar con `NEXT_PUBLIC_APP_ENV=production` y la URL de API configurada. La API todavía no existe: sin ella se muestra el error correspondiente, no datos simulados.

### Dependencias

`npm audit --omit=dev` no reporta vulnerabilidades de producción al validar esta implementación. La auditoría completa reporta cinco entradas de severidad alta en la cadena de desarrollo `eslint-config-next → fast-glob → micromatch → braces` (GHSA-vfj7-8cjw-p6xm); el registro todavía no ofrece una versión corregida de `braces`. No se aplicó `audit fix --force`, porque propone bajar Next/ESLint a otra versión mayor. Revisar este aviso cuando se publique una corrección; no procesar patrones de glob no confiables con estas herramientas de desarrollo.
