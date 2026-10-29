import { Department, type Employee } from "../../src/business/entities/employee.entity.js";
import { EquipmentStatus, EquipmentType, type Equipment } from "../../src/business/entities/equipment.entity.js";
import { LoanStatus, type Loan } from "../../src/business/entities/loan.entity.js";
import { Role, UserStatus, type User } from "../../src/business/entities/user.entity.js";
import type { NewRecord } from "../../src/business/ports/repositories.js";
import { createPrismaClient, type PrismaClient } from "../../src/db/client.js";
import { createPrismaUnitOfWork } from "../../src/db/unit-of-work.js";
import { testDatabaseUrl } from "./test-database.js";

export function connect() {
  const prisma = createPrismaClient(testDatabaseUrl());
  const uow = createPrismaUnitOfWork(prisma);
  return { prisma, uow, repositories: uow.repositories };
}

const tables = ["sessions", "loans", "users", "employees", "devices"];

export async function truncate(prisma: PrismaClient) {
  await prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe("SET FOREIGN_KEY_CHECKS = 0");
    for (const table of tables) await tx.$executeRawUnsafe(`TRUNCATE TABLE \`${table}\``);
    await tx.$executeRawUnsafe("SET FOREIGN_KEY_CHECKS = 1");
  });
}

let sequence = 0;
const next = () => String(++sequence).padStart(7, "0");
// DATETIME(3): milisegundos, igual que Date.
const now = () => new Date();

export const equipmentFixture = (data: Partial<NewRecord<Equipment>> = {}): NewRecord<Equipment> => ({
  code: `LAP-${next()}`,
  name: "MacBook Pro 14",
  type: EquipmentType.Laptop,
  brand: "Apple",
  model: "M3",
  status: EquipmentStatus.Available,
  createdAt: now(),
  ...data,
});

export const employeeFixture = (data: Partial<NewRecord<Employee>> = {}): NewRecord<Employee> => ({
  firstName: "Ana",
  lastName: "García",
  identity: `001-${next()}-1`,
  department: Department.Finance,
  phone: "",
  active: true,
  createdAt: now(),
  ...data,
});

export const userFixture = (data: Partial<NewRecord<User>> = {}): NewRecord<User> => ({
  name: "Laura Méndez",
  email: `usuario${next()}@empresa.com`,
  role: Role.Manager,
  status: UserStatus.Active,
  employeeId: null,
  passwordHash: "hash",
  createdAt: now(),
  ...data,
});

export const loanFixture = (
  data: Pick<Loan, "employeeId" | "equipmentId" | "registeredById"> & Partial<NewRecord<Loan>>,
): NewRecord<Loan> => ({
  borrowedOn: "2026-10-01",
  dueOn: "2026-10-20",
  returnedOn: null,
  status: LoanStatus.Active,
  returnedById: null,
  createdAt: now(),
  ...data,
});
