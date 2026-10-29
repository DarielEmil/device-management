import "dotenv/config";
import { createScryptPasswordHasher } from "../src/business/rules/security.rules.js";
import { createPrismaClient } from "../src/db/client.js";

// Datos demo de desarrollo, los mismos que src/mocks/data/seed.ts del frontend.
// Solo siembra una base vacía; para volver a sembrar: npm run prisma:reset.

const DEMO_PASSWORD = "Demo2026!";

const employees = [
  { key: "ana", firstName: "Ana", lastName: "García", nationalId: "001-1234567-8", department: "Finanzas", phone: "809-555-0142", isActive: true, email: "ana.garcia" },
  { key: "carlos", firstName: "Carlos", lastName: "Ruiz", nationalId: "402-2345678-9", department: "Ventas", phone: "829-555-0177", isActive: true, email: "carlos.ruiz" },
  { key: "lucia", firstName: "Lucía", lastName: "Pérez", nationalId: "031-0456789-1", department: "Operaciones", phone: "849-555-0190", isActive: true, email: "lucia.perez" },
  { key: "diego", firstName: "Diego", lastName: "Torres", nationalId: "001-7654321-0", department: "Tecnología", phone: "809-555-0123", isActive: true, email: "diego.torres" },
  { key: "marta", firstName: "Marta", lastName: "López", nationalId: "223-0987654-3", department: "Recursos Humanos", phone: "829-555-0165", isActive: true, email: "marta.lopez" },
  { key: "sofia", firstName: "Sofía", lastName: "Romero", nationalId: "402-1112223-4", department: "Ventas", phone: "849-555-0101", isActive: false, email: "sofia.romero" },
] as const;

const devices = [
  { code: "EQ-001", name: "Dell Latitude 5440", type: "Laptop", brand: "Dell", model: "Latitude 5440" },
  { code: "EQ-002", name: "Apple MacBook Air M2", type: "Laptop", brand: "Apple", model: "MacBook Air M2" },
  { code: "EQ-003", name: "Dell P2422H", type: "Monitor", brand: "Dell", model: "P2422H" },
  { code: "EQ-004", name: "Samsung Galaxy Tab S9", type: "Tablet", brand: "Samsung", model: "Galaxy Tab S9" },
  { code: "EQ-005", name: "Lenovo ThinkPad T14", type: "Laptop", brand: "Lenovo", model: "ThinkPad T14" },
  { code: "EQ-006", name: "Dell Latitude 5450", type: "Laptop", brand: "Dell", model: "Latitude 5450" },
  { code: "EQ-007", name: "LG 27UP850", type: "Monitor", brand: "LG", model: "27UP850" },
  { code: "EQ-008", name: "Logitech MX Keys", type: "Periférico", brand: "Logitech", model: "MX Keys" },
  { code: "EQ-009", name: "Apple iPad Air", type: "Tablet", brand: "Apple", model: "iPad Air" },
  { code: "EQ-010", name: "HP EliteBook 840", type: "Laptop", brand: "HP", model: "EliteBook 840" },
] as const;

const loans = [
  { employee: "ana", device: "EQ-001", loanDate: "2026-09-21", expectedReturnDate: "2026-10-04", actualReturnDate: null },
  { employee: "carlos", device: "EQ-002", loanDate: "2026-09-24", expectedReturnDate: "2026-10-06", actualReturnDate: null },
  { employee: "lucia", device: "EQ-003", loanDate: "2026-10-01", expectedReturnDate: "2026-10-08", actualReturnDate: null },
  { employee: "diego", device: "EQ-004", loanDate: "2026-10-02", expectedReturnDate: "2026-10-10", actualReturnDate: null },
  { employee: "marta", device: "EQ-005", loanDate: "2026-10-05", expectedReturnDate: "2026-10-16", actualReturnDate: null },
  { employee: "ana", device: "EQ-010", loanDate: "2026-09-01", expectedReturnDate: "2026-09-15", actualReturnDate: "2026-09-14" },
] as const;

const date = (value: string) => new Date(`${value}T00:00:00.000Z`);

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("Falta DATABASE_URL.");
  const prisma = createPrismaClient(databaseUrl);
  try {
    if ((await prisma.user.count()) > 0) {
      console.log("La base ya tiene datos; no se siembra.");
      return;
    }
    const passwordHash = await createScryptPasswordHasher().hash(DEMO_PASSWORD);

    await prisma.$transaction(async (tx) => {
      const { id: managerId } = await tx.user.create({
        data: {
          name: "Laura Méndez",
          email: "laura.mendez@empresa.com",
          passwordHash,
          role: "Encargado",
          status: "Activo",
        },
      });

      const employeeIds = new Map<string, string>();
      for (const { key, email, ...employee } of employees) {
        const { id: employeeId } = await tx.employee.create({ data: employee });
        employeeIds.set(key, employeeId);
        await tx.user.create({
          data: {
            employeeId,
            name: `${employee.firstName} ${employee.lastName}`,
            email: `${email}@empresa.com`,
            passwordHash,
            role: "Empleado",
            status: employee.isActive ? "Activo" : "Inactivo",
          },
        });
      }

      const deviceIds = new Map<string, string>();
      const loaned = new Set<string>(
        loans.filter((loan) => !loan.actualReturnDate).map((loan) => loan.device),
      );
      for (const device of devices) {
        const { id: deviceId } = await tx.device.create({
          data: { ...device, status: loaned.has(device.code) ? "Prestado" : "Disponible" },
        });
        deviceIds.set(device.code, deviceId);
      }

      for (const loan of loans) {
        await tx.loan.create({
          data: {
            employeeId: employeeIds.get(loan.employee)!,
            deviceId: deviceIds.get(loan.device)!,
            registeredById: managerId,
            returnedById: loan.actualReturnDate ? managerId : null,
            loanDate: date(loan.loanDate),
            expectedReturnDate: date(loan.expectedReturnDate),
            actualReturnDate: loan.actualReturnDate ? date(loan.actualReturnDate) : null,
            status: loan.actualReturnDate ? "Devuelto" : "Activo",
          },
        });
      }
    });
    console.log(`Base sembrada. Contraseña de todas las cuentas demo: ${DEMO_PASSWORD}`);
  } finally {
    await prisma.$disconnect();
  }
}

await main();
