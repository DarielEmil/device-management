import {
  EquipmentStatus,
  EquipmentType,
} from "../entities/equipment.entity.js";
import {
  LoanDisplayStatus,
  LoanStatus,
  type LoanView,
} from "../entities/loan.entity.js";
import { Role, type Actor } from "../entities/user.entity.js";
import { byDueOn, byRecentActivity } from "../rules/loans.rules.js";
import { authorize, Permission } from "../rules/permissions.rules.js";
import type { UseCaseDeps } from "./deps.use-case.js";
import { listVisibleLoans } from "./loans.use-case.js";

const RECENT_LIMIT = 5;

interface LoanSummary {
  activeLoans: number;
  dueSoon: number;
  overdue: number;
  pending: LoanView[];
  recent: LoanView[];
}

export interface ManagerDashboard extends LoanSummary {
  role: typeof Role.Manager;
  equipment: { total: number; available: number; loaned: number };
  distribution: { type: EquipmentType; count: number }[];
}

export interface EmployeeDashboard extends LoanSummary {
  role: typeof Role.Employee;
}

export type Dashboard = ManagerDashboard | EmployeeDashboard;

function summarize(loans: LoanView[]): LoanSummary {
  const active = loans.filter((loan) => loan.status === LoanStatus.Active);
  return {
    activeLoans: active.length,
    dueSoon: active.filter((loan) => loan.displayStatus === LoanDisplayStatus.DueSoon).length,
    overdue: active.filter((loan) => loan.displayStatus === LoanDisplayStatus.Overdue).length,
    pending: active.filter((loan) => loan.displayStatus !== LoanDisplayStatus.Active).sort(byDueOn),
    recent: [...loans].sort(byRecentActivity).slice(0, RECENT_LIMIT),
  };
}

export function createDashboardUseCases({ uow, clock }: UseCaseDeps) {
  return {
    async getDashboard(actor: Actor): Promise<Dashboard> {
      authorize(actor, Permission.DashboardRead);
      const loans = summarize(
        await listVisibleLoans(uow.repositories, actor, clock.today()),
      );
      if (actor.role === Role.Employee) return { role: Role.Employee, ...loans };
      const equipment = await uow.repositories.equipment.list();
      return {
        role: Role.Manager,
        ...loans,
        equipment: {
          total: equipment.length,
          available: equipment.filter((item) => item.status === EquipmentStatus.Available).length,
          loaned: equipment.filter((item) => item.status === EquipmentStatus.Loaned).length,
        },
        distribution: Object.values(EquipmentType).map((type) => ({
          type,
          count: equipment.filter((item) => item.type === type).length,
        })),
      };
    },
  };
}

export type DashboardUseCases = ReturnType<typeof createDashboardUseCases>;
