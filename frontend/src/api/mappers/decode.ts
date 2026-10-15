import type { z } from "zod";
import { DomainError } from "@/business/entities/models";

export function decode<T>(schema: z.ZodType<T>, body: unknown): T {
  const result = schema.safeParse(body);
  if (!result.success)
    throw new DomainError(
      "La API devolvió datos con un formato inesperado.",
      {},
      "INVALID_RESPONSE",
    );
  return result.data;
}
