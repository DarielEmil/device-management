import { Department } from "../business/entities/employee.entity.js";
import { EquipmentStatus, EquipmentType } from "../business/entities/equipment.entity.js";
import { LoanStatus, type IsoDate } from "../business/entities/loan.entity.js";
import { Role, UserStatus } from "../business/entities/user.entity.js";

// Negocio usa claves en inglés; la DB guarda los valores en español que
// muestran el frontend y los CHECK de la migración inicial.

function codec<Domain extends string>(pairs: Record<Domain, string>, name: string) {
  const fromDb = new Map(Object.entries(pairs).map(([domain, db]) => [db, domain]));
  return {
    toDb: (value: Domain): string => pairs[value],
    fromDb(value: string): Domain {
      const domain = fromDb.get(value);
      if (domain === undefined) throw new Error(`Valor de ${name} desconocido en la DB: ${value}`);
      return domain as Domain;
    },
  };
}

// Valores que se guardan tal cual, pero se validan al leer.
function catalog<T extends string>(values: Record<string, T>, name: string) {
  const known = new Set<string>(Object.values(values));
  return (value: string): T => {
    if (!known.has(value)) throw new Error(`Valor de ${name} desconocido en la DB: ${value}`);
    return value as T;
  };
}

export const equipmentStatus = codec<EquipmentStatus>(
  { [EquipmentStatus.Available]: "Disponible", [EquipmentStatus.Loaned]: "Prestado" },
  "devices.status",
);

export const loanStatus = codec<LoanStatus>(
  { [LoanStatus.Active]: "Activo", [LoanStatus.Returned]: "Devuelto" },
  "loans.status",
);

export const role = codec<Role>(
  { [Role.Manager]: "Encargado", [Role.Employee]: "Empleado" },
  "users.role",
);

export const userStatus = codec<UserStatus>(
  {
    [UserStatus.Active]: "Activo",
    [UserStatus.Inactive]: "Inactivo",
    [UserStatus.Invited]: "Invitado",
  },
  "users.status",
);

export const equipmentType = catalog(EquipmentType, "devices.type");
export const department = catalog(Department, "employees.department");

// Columnas DATE: Prisma las lee y escribe como medianoche UTC.
export const toDbDate = (date: IsoDate): Date => new Date(`${date}T00:00:00.000Z`);
export const fromDbDate = (date: Date): IsoDate => date.toISOString().slice(0, 10);
