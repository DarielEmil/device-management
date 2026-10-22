import { equipmentTypes, type EquipmentType } from "../entities/equipment.js";
import type { LoanView } from "../entities/loan.js";
import type { Actor } from "../entities/user.js";
import { byDueOn, byRecentActivity } from "../rules/loans.js";
import { authorize } from "../rules/permissions.js";
import type { UseCaseDeps } from "./deps.js";
import { listVisibleLoans } from "./loans.js";

const RECENT_LIMIT = 5;

interface LoanSummary {
  activeLoans: number;
  dueSoon: number;
  overdue: number;
  // Préstamos "Por vencer" y "Atrasado", primero lo que vence antes.
  pending: LoanView[];
  // Últimos préstamos y devoluciones.
  recent: LoanView[];
}

export interface ManagerDashboard extends LoanSummary {
  role: "Encargado";
  equipment: { total: number; available: number; loaned: number };
  distribution: { type: EquipmentType; count: number }[];
}

// Sin indicadores administrativos: solo sus propios préstamos.
export interface EmployeeDashboard extends LoanSummary {
  role: "Empleado";
}

export type Dashboard = ManagerDashboard | EmployeeDashboard;

function summarize(loans: LoanView[]): LoanSummary {
  const active = loans.filter((loan) => loan.status === "Activo");
  return {
    activeLoans: active.length,
    dueSoon: active.filter((loan) => loan.displayStatus === "Por vencer").length,
    overdue: active.filter((loan) => loan.displayStatus === "Atrasado").length,
    pending: active.filter((loan) => loan.displayStatus !== "Activo").sort(byDueOn),
    recent: [...loans].sort(byRecentActivity).slice(0, RECENT_LIMIT),
  };
}

export function createDashboardUseCases({ uow, clock }: UseCaseDeps) {
  return {
    async getDashboard(actor: Actor): Promise<Dashboard> {
      authorize(actor, "dashboard:read");
      const loans = summarize(
        await listVisibleLoans(uow.repositories, actor, clock.today()),
      );
      if (actor.role === "Empleado") return { role: "Empleado", ...loans };
      const equipment = await uow.repositories.equipment.list();
      return {
        role: "Encargado",
        ...loans,
        equipment: {
          total: equipment.length,
          available: equipment.filter((item) => item.status === "Disponible").length,
          loaned: equipment.filter((item) => item.status === "Prestado").length,
        },
        distribution: equipmentTypes.map((type) => ({
          type,
          count: equipment.filter((item) => item.type === type).length,
        })),
      };
    },
  };
}

export type DashboardUseCases = ReturnType<typeof createDashboardUseCases>;
