import { expect, test, type Page } from "@playwright/test";

async function login(page: Page, role: "manager" | "employee" = "manager") {
  await page.goto("/login");
  await page
    .getByRole("button", {
      name: role === "manager" ? "Laura · Encargado" : "Ana · Empleado",
    })
    .click();
  await page
    .getByRole("button", { name: "Iniciar sesión", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Dashboard", exact: true }),
  ).toBeVisible();
}
async function navigate(page: Page, label: string) {
  const paths: Record<string, string> = {
    Dashboard: "/dashboard",
    Inventario: "/inventory",
    Préstamos: "/loans",
    Usuarios: "/users",
    "Equipos disponibles": "/available-equipment",
    "Mis préstamos": "/my-loans",
  };
  await page
    .getByRole("navigation", { name: "Navegación principal" })
    .getByRole("link", { name: label, exact: true })
    .click();
  await expect(
    page.getByRole("heading", {
      name: label === "Usuarios" ? "Gestión de usuarios" : label,
      exact: true,
    }),
  ).toBeVisible();
  expect(new URL(page.url()).pathname).toBe(paths[label]);
}

test("login inválido muestra error inline y permite corregirlo", async ({
  page,
}) => {
  await page.goto("/login");
  await page
    .getByLabel("Correo electrónico", { exact: false })
    .fill("ana.garcia@empresa.com");
  await page.getByLabel(/^Contraseña/).fill("incorrecta");
  await page
    .getByRole("button", { name: "Iniciar sesión", exact: true })
    .click();
  await expect(
    page.getByText("Correo o contraseña incorrectos.", { exact: true }),
  ).toBeVisible();
  await page.getByLabel(/^Contraseña/).fill("Demo2026!");
  await page
    .getByRole("button", { name: "Iniciar sesión", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Dashboard", exact: true }),
  ).toBeVisible();
});

test("inventario permite registrar, filtrar y detectar códigos duplicados", async ({
  page,
}) => {
  await login(page);
  await navigate(page, "Inventario");
  await page
    .getByRole("button", { name: "Registrar equipo", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await expect(
    dialog.getByRole("button", { name: "Registrar equipo", exact: true }),
  ).toBeDisabled();
  await dialog.getByLabel("Código de activo").fill("EQ-006");
  await dialog.getByLabel(/^Nombre/).fill("Equipo de prueba");
  await dialog.getByLabel(/^Tipo/).selectOption("Laptop");
  await dialog
    .getByRole("button", { name: "Registrar equipo", exact: true })
    .click();
  await expect(
    dialog.getByText("Ya existe un equipo con ese código de activo."),
  ).toBeVisible();
  await expect(
    dialog.getByRole("button", { name: "Registrar equipo", exact: true }),
  ).toBeDisabled();
  await dialog.getByLabel("Código de activo").fill("EQ-011");
  await dialog
    .getByRole("button", { name: "Registrar equipo", exact: true })
    .click();
  await expect(dialog).not.toBeVisible();
  await page.getByRole("searchbox").fill("EQ-011");
  const row = page.getByRole("row").filter({ hasText: "EQ-011" });
  await expect(row).toContainText("Disponible");
  await expect(row).toContainText("Equipo de prueba");
  await page.getByRole("searchbox").fill("no-existe");
  await expect(
    page.getByRole("heading", { name: "No encontramos equipos" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Limpiar filtros" }).click();
  await expect(
    page.getByRole("row").filter({ hasText: "EQ-001" }),
  ).toBeVisible();
});

test("nuevo préstamo valida fechas, usa selector por teclado y registra devolución", async ({
  page,
}) => {
  await login(page);
  await navigate(page, "Inventario");
  await page
    .getByRole("button", { name: "Prestar EQ-006", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await dialog
    .getByRole("combobox", { name: "Empleado", exact: false })
    .click();
  const search = page.getByRole("searchbox", { name: "Buscar empleado" });
  await search.fill("Ana");
  await search.press("Enter");
  await dialog.getByLabel("Fecha prevista de devolución").fill("2026-10-06");
  await expect(
    dialog.getByText("La fecha prevista no puede ser anterior a hoy."),
  ).toBeVisible();
  await expect(
    dialog.getByRole("button", { name: "Confirmar préstamo" }),
  ).toBeDisabled();
  await dialog.getByLabel("Fecha prevista de devolución").fill("2026-10-20");
  await dialog.getByRole("button", { name: "Confirmar préstamo" }).click();
  await expect(dialog).not.toBeVisible();
  await expect(
    page.getByRole("row").filter({ hasText: "EQ-006" }),
  ).toContainText("Prestado");
  await navigate(page, "Préstamos");
  await page
    .getByRole("button", { name: "Registrar devolución de EQ-006" })
    .click();
  await expect(dialog).toContainText("Ana García");
  await dialog
    .getByRole("button", { name: "Registrar devolución", exact: true })
    .click();
  await expect(dialog).not.toBeVisible();
  await page.getByRole("button", { name: "Devueltos", exact: false }).click();
  await expect(
    page.getByRole("row").filter({ hasText: "EQ-006" }),
  ).toContainText("Devuelto");
  await expect(
    page.getByRole("button", { name: "Registrar devolución de EQ-006" }),
  ).toHaveCount(0);
});

test("registra empleado, rechaza cédula duplicada y crea invitación simulada", async ({
  page,
}) => {
  await login(page);
  await navigate(page, "Usuarios");
  await page.getByRole("link", { name: "Empleados", exact: false }).click();
  await page
    .getByRole("button", { name: "Registrar empleado", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Nombres").fill("Pedro");
  await dialog.getByLabel("Apellidos").fill("Ramírez");
  await dialog.getByLabel("Cédula").fill("001-1234567-8");
  await dialog.getByLabel("Departamento").selectOption("Tecnología");
  await dialog
    .getByRole("button", { name: "Registrar empleado", exact: true })
    .click();
  await expect(
    dialog.getByText("Ya existe un empleado con esta cédula (Ana García)."),
  ).toBeVisible();
  await dialog.getByLabel("Cédula").fill("001-2223334-5");
  await dialog
    .getByRole("button", { name: "Registrar empleado", exact: true })
    .click();
  await expect(dialog).not.toBeVisible();
  await expect(
    page.getByRole("row").filter({ hasText: "Pedro Ramírez" }),
  ).toContainText("Sin cuenta");
  await page.getByRole("link", { name: "Cuentas", exact: false }).click();
  await page.getByRole("button", { name: "Invitar usuario" }).click();
  await dialog
    .getByLabel("Correo electrónico")
    .fill("pedro.ramirez@empresa.com");
  await dialog
    .getByRole("combobox", { name: "Vincular a empleado (opcional)" })
    .click();
  await page
    .getByRole("option", { name: "Pedro Ramírez", exact: false })
    .click();
  await dialog.getByRole("button", { name: "Crear invitación" }).click();
  await expect(dialog).not.toBeVisible();
  await expect(
    page.getByRole("row").filter({ hasText: "pedro.ramirez@empresa.com" }),
  ).toContainText("Invitado");
});

test("desactivar cuenta no cierra sus préstamos", async ({ page }) => {
  await login(page);
  await navigate(page, "Usuarios");
  const row = page
    .getByRole("row")
    .filter({ hasText: "ana.garcia@empresa.com" });
  await row.getByRole("button", { name: "Desactivar" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toContainText("1 préstamo activo");
  await dialog
    .getByRole("button", { name: "Desactivar usuario", exact: true })
    .click();
  await expect(dialog).not.toBeVisible();
  await expect(row).toContainText("Inactivo");
  await navigate(page, "Préstamos");
  await expect(
    page.getByRole("row").filter({ hasText: "EQ-001" }),
  ).toContainText("Atrasado");
});

test("empleado ve solo sus préstamos y ninguna acción administrativa", async ({
  page,
}) => {
  await login(page, "employee");
  await expect(
    page
      .getByRole("navigation", { name: "Navegación principal" })
      .getByRole("link"),
  ).toHaveCount(3);
  await expect(
    page.getByRole("link", { name: "Usuarios", exact: true }),
  ).toHaveCount(0);
  await expect(page.getByText("Equipos totales", { exact: true })).toHaveCount(
    0,
  );
  await expect(
    page.getByRole("button", { name: "Nuevo préstamo" }),
  ).toHaveCount(0);
  await navigate(page, "Mis préstamos");
  await expect(
    page.getByRole("row").filter({ hasText: "EQ-001" }),
  ).toBeVisible();
  await expect(page.getByRole("row").filter({ hasText: "EQ-002" })).toHaveCount(
    0,
  );
  await page.getByRole("button", { name: "Todos", exact: false }).click();
  await expect(
    page.getByRole("row").filter({ hasText: "EQ-010" }),
  ).toBeVisible();
  await navigate(page, "Equipos disponibles");
  await expect(
    page.getByRole("row").filter({ hasText: "Prestado" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Prestar", exact: false }),
  ).toHaveCount(0);
  // Next patches pushState so this exercises the route guard without reloading the in-memory demo.
  await page.evaluate(() => window.history.pushState(null, "", "/users"));
  await expect(page).toHaveURL(/\/dashboard$/);
});

test("sesión y datos demo se reinician al recargar", async ({ page }) => {
  await login(page);
  await page.reload();
  await expect(page).toHaveURL(/\/login$/);
  await page.goto("/inventory");
  await expect(page).toHaveURL(/\/login$/);
});

test("modal atrapa el foco, permite Escape y devuelve el foco al disparador", async ({
  page,
}) => {
  await login(page);
  await navigate(page, "Inventario");
  const trigger = page.getByRole("button", {
    name: "Registrar equipo",
    exact: true,
  });
  await trigger.click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await page.keyboard.press("Shift+Tab");
  await expect(dialog.locator(":focus")).toHaveCount(1);
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(trigger).toBeFocused();
});

test("registro público crea un empleado sin selector de rol", async ({
  page,
}) => {
  await page.goto("/register");
  await expect(page.getByLabel("Rol", { exact: true })).toHaveCount(0);
  await page.getByLabel("Nombre completo").fill("Pedro Ramírez");
  await page.getByLabel("Correo electrónico").fill("pedro.ramirez@empresa.com");
  await page.getByLabel(/^Contraseña/).fill("Demo2026!");
  await page.getByRole("button", { name: "Crear cuenta", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "No tienes equipos asignados" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Usuarios", exact: true }),
  ).toHaveCount(0);
});

test("recuperación informa que no se envía correo real en mocks", async ({
  page,
}) => {
  await page.goto("/forgot-password");
  await page.getByLabel("Correo electrónico").fill("ana.garcia@empresa.com");
  await page.getByRole("button", { name: "Enviar instrucciones" }).click();
  await expect(page.getByRole("status")).toContainText(
    "No se ha enviado ningún correo real.",
  );
});

test("captura de referencia desktop y navegación sin errores de consola", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await login(page);
  await page.screenshot({
    path: "test-results/dashboard-desktop.png",
    fullPage: true,
  });
  await navigate(page, "Inventario");
  await page.screenshot({
    path: "test-results/inventory-desktop.png",
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Registrar equipo", exact: true })
    .click();
  await page.screenshot({
    path: "test-results/equipment-modal.png",
    fullPage: true,
  });
  expect(errors).toEqual([]);
});

test("los indicadores navegan a rutas en inglés y conservan los filtros", async ({ page }) => {
  await login(page);
  await page.getByRole("link", { name: /Disponibles/ }).click();
  await expect(page).toHaveURL(/\/inventory\?status=available$/);
  await expect(page.getByRole("combobox", { name: "Filtrar por estado", exact: true })).toHaveValue("available");
  await expect(page.getByRole("row").filter({ hasText: "EQ-006" })).toBeVisible();
  await expect(page.getByRole("row").filter({ hasText: "EQ-001" })).toHaveCount(0);
  await navigate(page, "Dashboard");
  await page.getByRole("link", { name: /Devoluciones atrasadas/ }).click();
  await expect(page).toHaveURL(/\/loans\?status=overdue$/);
  await expect(page.getByRole("combobox", { name: "Filtrar por estado del préstamo" })).toHaveValue("overdue");
  await expect(page.getByRole("row").filter({ hasText: "EQ-003" })).toHaveCount(0);
});

test("escritorio estrecho mantiene las tablas dentro de su contenedor", async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 900 });
  await login(page);
  await navigate(page, "Inventario");
  await expect(page.getByRole("button", { name: "Registrar equipo", exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await navigate(page, "Usuarios");
  await page.getByRole("link", { name: "Empleados", exact: false }).click();
  await expect(page.getByRole("table", { name: "Empleados registrados" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
