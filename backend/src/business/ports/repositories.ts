import type { Employee } from "../entities/employee.js";
import type { Equipment, EquipmentStatus } from "../entities/equipment.js";
import type {
  IsoDate,
  Loan,
  LoanDetails,
  LoanStatus,
} from "../entities/loan.js";
import type { Session } from "../entities/session.js";
import type { User, UserStatus } from "../entities/user.js";

// Contratos que implementa la capa DB (issue #4). Negocio solo conoce estas
// interfaces; nunca Prisma ni SQL.
//
// Unicidad (`code`, `identity`, `email` y el `employeeId` de la cuenta, que
// admite varios NULL): los casos de uso la verifican antes de insertar, pero
// dos peticiones simultáneas pueden pasar la verificación. Si la DB rechaza un
// `insert` por unicidad, el adaptador lanza un DomainError CONFLICT con el
// mismo campo y mensaje que usa el caso de uso.

export interface EquipmentRepository {
  list(filter?: { status?: EquipmentStatus }): Promise<Equipment[]>;
  findById(id: string): Promise<Equipment | null>;
  // Bloquea la fila hasta que termine la transacción (SELECT ... FOR UPDATE)
  // para que dos préstamos simultáneos del mismo equipo no puedan pasar.
  findByIdForUpdate(id: string): Promise<Equipment | null>;
  findByCode(code: string): Promise<Equipment | null>;
  insert(equipment: Equipment): Promise<void>;
  updateStatus(id: string, status: EquipmentStatus): Promise<void>;
}

export interface EmployeeRepository {
  list(): Promise<Employee[]>;
  findById(id: string): Promise<Employee | null>;
  // Bloquea la fila hasta que termine la transacción (SELECT ... FOR UPDATE).
  // Lo usan las operaciones que dependen del estado del empleado (vincular una
  // cuenta, prestarle un equipo, darlo de baja) para no cruzarse entre sí.
  findByIdForUpdate(id: string): Promise<Employee | null>;
  findByIdentity(identity: string): Promise<Employee | null>;
  insert(employee: Employee): Promise<void>;
  setActive(id: string, active: boolean): Promise<void>;
}

export interface LoanRepository {
  // Devuelve cada préstamo con código y nombre del equipo y nombre del empleado.
  list(filter?: {
    employeeId?: string;
    status?: LoanStatus;
  }): Promise<LoanDetails[]>;
  findById(id: string): Promise<LoanDetails | null>;
  // Igual que findById, pero bloquea la fila hasta el fin de la transacción.
  findByIdForUpdate(id: string): Promise<LoanDetails | null>;
  findActiveByEquipment(equipmentId: string): Promise<Loan | null>;
  countActiveByEmployee(employeeId: string): Promise<number>;
  insert(loan: Loan): Promise<void>;
  markReturned(id: string, returnedOn: IsoDate): Promise<void>;
}

export interface UserRepository {
  list(): Promise<User[]>;
  findById(id: string): Promise<User | null>;
  // `email` llega ya en minúsculas.
  findByEmail(email: string): Promise<User | null>;
  findByEmployeeId(employeeId: string): Promise<User | null>;
  insert(user: User): Promise<void>;
  updateStatus(id: string, status: UserStatus): Promise<void>;
}

export interface SessionRepository {
  findById(id: string): Promise<Session | null>;
  insert(session: Session): Promise<void>;
  touch(id: string, lastSeenAt: Date, expiresAt: Date): Promise<void>;
  // Idempotente: no falla si la sesión ya no existe.
  delete(id: string): Promise<void>;
  deleteByUserId(userId: string): Promise<void>;
}

export interface Repositories {
  equipment: EquipmentRepository;
  employees: EmployeeRepository;
  loans: LoanRepository;
  users: UserRepository;
  sessions: SessionRepository;
}
