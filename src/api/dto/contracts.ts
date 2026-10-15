import { z } from "zod";
import {
  accountSchema,
  employeeSchema,
  equipmentSchema,
  loanSchema,
  sessionSchema,
} from "@/business/entities/models";

// HTTP uses an explicit { data: ... } envelope. DTOs are validated before entering business/UI.
export const equipmentListDto = z.object({ data: z.array(equipmentSchema) });
export const employeeListDto = z.object({ data: z.array(employeeSchema) });
export const loanListDto = z.object({ data: z.array(loanSchema) });
export const accountListDto = z.object({ data: z.array(accountSchema) });
export const sessionDto = z.object({ data: sessionSchema.nullable() });
export const equipmentDto = z.object({ data: equipmentSchema });
export const employeeDto = z.object({ data: employeeSchema });
export const loanDto = z.object({ data: loanSchema });
export const accountDto = z.object({ data: accountSchema });
