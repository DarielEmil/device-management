import type { Employee } from "../entities/employee.entity.js";
import type { Equipment, EquipmentStatus } from "../entities/equipment.entity.js";
import type {
  IsoDate,
  Loan,
  LoanDetails,
  LoanStatus,
} from "../entities/loan.entity.js";
import type { Session } from "../entities/session.entity.js";
import type { User, UserStatus } from "../entities/user.entity.js";

// El id lo genera la DB al insertar (UUID v7): insert recibe el registro sin id
// y devuelve el registro creado. Las sesiones son la excepción: su id es el hash del token.
export type NewRecord<T extends { id: string }> = Omit<T, "id">;

// Si la DB rechaza un insert por unicidad, el adaptador lanza DomainError CONFLICT con el mismo campo y mensaje.

export interface EquipmentRepository {
  list(filter?: { status?: EquipmentStatus }): Promise<Equipment[]>;
  findById(id: string): Promise<Equipment | null>;
  findByIdForUpdate(id: string): Promise<Equipment | null>;
  findByCode(code: string): Promise<Equipment | null>;
  insert(equipment: NewRecord<Equipment>): Promise<Equipment>;
  updateStatus(id: string, status: EquipmentStatus): Promise<void>;
}

export interface EmployeeRepository {
  list(): Promise<Employee[]>;
  findById(id: string): Promise<Employee | null>;
  findByIdForUpdate(id: string): Promise<Employee | null>;
  findByIdentity(identity: string): Promise<Employee | null>;
  insert(employee: NewRecord<Employee>): Promise<Employee>;
  setActive(id: string, active: boolean): Promise<void>;
}

export interface LoanRepository {
  list(filter?: {
    employeeId?: string;
    status?: LoanStatus;
  }): Promise<LoanDetails[]>;
  findById(id: string): Promise<LoanDetails | null>;
  findByIdForUpdate(id: string): Promise<LoanDetails | null>;
  findActiveByEquipment(equipmentId: string): Promise<Loan | null>;
  insert(loan: NewRecord<Loan>): Promise<Loan>;
  markReturned(id: string, returnedOn: IsoDate, returnedById: string): Promise<void>;
}

export interface UserRepository {
  list(): Promise<User[]>;
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  findByEmployeeId(employeeId: string): Promise<User | null>;
  insert(user: NewRecord<User>): Promise<User>;
  updateStatus(id: string, status: UserStatus): Promise<void>;
}

export interface SessionRepository {
  findById(id: string): Promise<Session | null>;
  insert(session: Session): Promise<void>;
  // Solo avanza si `lastSeenAt` es posterior (una sola sentencia) y no recrea una sesión borrada.
  touch(id: string, lastSeenAt: Date, expiresAt: Date): Promise<void>;
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
