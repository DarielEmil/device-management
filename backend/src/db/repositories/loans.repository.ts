import { fullName } from "../../business/entities/employee.entity.js";
import type { Loan, LoanDetails } from "../../business/entities/loan.entity.js";
import { LoanStatus } from "../../business/entities/loan.entity.js";
import type { LoanRepository } from "../../business/ports/repositories.js";
import { translateUniqueViolation } from "../errors.js";
import type { Loan as LoanRow } from "../generated/prisma/client.js";
import { fromDbDate, loanStatus, toDbDate } from "../mappers.js";
import type { Db } from "./db.js";

const withNames = {
  device: { select: { code: true, name: true } },
  employee: { select: { firstName: true, lastName: true } },
} as const;

type LoanRowWithNames = LoanRow & {
  device: { code: string; name: string };
  employee: { firstName: string; lastName: string };
};

const toLoan = (row: LoanRow): Loan => ({
  id: row.id,
  employeeId: row.employeeId,
  equipmentId: row.deviceId,
  borrowedOn: fromDbDate(row.loanDate),
  dueOn: fromDbDate(row.expectedReturnDate),
  returnedOn: row.actualReturnDate ? fromDbDate(row.actualReturnDate) : null,
  status: loanStatus.fromDb(row.status),
  registeredById: row.registeredById,
  returnedById: row.returnedById,
  createdAt: row.createdAt,
});

const toLoanDetails = ({ device, employee, ...row }: LoanRowWithNames): LoanDetails => ({
  ...toLoan(row),
  equipmentCode: device.code,
  equipmentName: device.name,
  employeeName: fullName(employee),
});

export function createLoanRepository(db: Db): LoanRepository {
  async function findById(id: string) {
    const row = await db.loan.findUnique({ where: { id }, include: withNames });
    return row ? toLoanDetails(row) : null;
  }

  return {
    async list(filter) {
      const rows = await db.loan.findMany({
        where: {
          employeeId: filter?.employeeId,
          status: filter?.status ? loanStatus.toDb(filter.status) : undefined,
        },
        include: withNames,
        orderBy: { id: "asc" },
      });
      return rows.map(toLoanDetails);
    },
    findById,
    async findByIdForUpdate(id) {
      await db.$queryRaw`SELECT id FROM loans WHERE id = ${id} FOR UPDATE`;
      return findById(id);
    },
    async findActiveByEquipment(equipmentId) {
      const row = await db.loan.findFirst({
        where: { deviceId: equipmentId, status: loanStatus.toDb(LoanStatus.Active) },
      });
      return row ? toLoan(row) : null;
    },
    async insert(loan) {
      // ux_loans_device_active rechaza un segundo préstamo Activo del mismo equipo.
      const row = await translateUniqueViolation(() =>
        db.loan.create({
          data: {
            employeeId: loan.employeeId,
            deviceId: loan.equipmentId,
            registeredById: loan.registeredById,
            returnedById: loan.returnedById,
            loanDate: toDbDate(loan.borrowedOn),
            expectedReturnDate: toDbDate(loan.dueOn),
            actualReturnDate: loan.returnedOn ? toDbDate(loan.returnedOn) : null,
            status: loanStatus.toDb(loan.status),
            createdAt: loan.createdAt,
          },
        }),
      );
      return toLoan(row);
    },
    async markReturned(id, returnedOn, returnedById) {
      await db.loan.update({
        where: { id },
        data: {
          actualReturnDate: toDbDate(returnedOn),
          returnedById,
          status: loanStatus.toDb(LoanStatus.Returned),
        },
      });
    },
  };
}
