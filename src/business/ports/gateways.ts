import type {
  Account,
  Employee,
  Equipment,
  Loan,
  Session,
} from "../entities/models";
import type {
  EmployeeInput,
  EquipmentInput,
  InviteInput,
  LoanInput,
  LoginInput,
  RegisterInput,
} from "../rules/validation";

export interface AuthGateway {
  current(): Promise<Session | null>;
  login(input: LoginInput): Promise<Session>;
  register(input: RegisterInput): Promise<Session>;
  logout(): Promise<void>;
  recover(email: string): Promise<void>;
}
export interface EquipmentGateway {
  list(): Promise<Equipment[]>;
  create(input: EquipmentInput): Promise<Equipment>;
}
export interface EmployeeGateway {
  list(): Promise<Employee[]>;
  create(input: EmployeeInput): Promise<Employee>;
}
export interface LoanGateway {
  list(): Promise<Loan[]>;
  create(input: LoanInput): Promise<Loan>;
  returnLoan(id: string): Promise<Loan>;
}
export interface AccountGateway {
  list(): Promise<Account[]>;
  invite(input: InviteInput): Promise<Account>;
  deactivate(id: string): Promise<Account>;
}
export interface Gateways {
  auth: AuthGateway;
  equipment: EquipmentGateway;
  employees: EmployeeGateway;
  loans: LoanGateway;
  accounts: AccountGateway;
}
