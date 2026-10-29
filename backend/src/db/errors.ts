import { DomainError, DomainErrorCode } from "../business/entities/errors.entity.js";
import { Prisma } from "./generated/prisma/client.js";

// Índice único → campo y mensaje que usa negocio para el mismo conflicto, así
// una carrera que solo detecta la DB responde igual que la validación previa.
const uniqueIndexes: Record<string, { field: string; message: string }> = {
  ux_devices_code: { field: "code", message: "Ya existe un equipo con ese código de activo." },
  ux_employees_national_id: { field: "identity", message: "Ya existe un empleado con esta cédula." },
  ux_users_email: { field: "email", message: "Ya existe una cuenta con este correo." },
  ux_users_employee: {
    field: "employeeId",
    message: "Selecciona un empleado activo sin cuenta vinculada.",
  },
  ux_loans_device_active: {
    field: "equipmentId",
    message: "El equipo seleccionado no está disponible.",
  },
};

function violatedIndex(error: Prisma.PrismaClientKnownRequestError): string | undefined {
  const meta = error.meta as
    | { target?: unknown; driverAdapterError?: { cause?: { constraint?: { index?: string } } } }
    | undefined;
  const index = meta?.driverAdapterError?.cause?.constraint?.index;
  if (index) return index;
  return typeof meta?.target === "string" ? meta.target : undefined;
}

export async function translateUniqueViolation<T>(write: () => Promise<T>): Promise<T> {
  try {
    return await write();
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const unique = uniqueIndexes[violatedIndex(error) ?? ""];
      if (unique)
        throw new DomainError(unique.message, DomainErrorCode.Conflict, {
          [unique.field]: unique.message,
        });
    }
    throw error;
  }
}
