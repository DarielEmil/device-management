import { z } from "zod";

export interface AppConfig {
  nodeEnv: "development" | "test" | "production";
  port: number;
  // Orígenes del frontend: CORS y la protección CSRF usan la misma lista.
  corsOrigins: string[];
  databaseUrl: string;
  cookieSecure: boolean;
}

const isOrigin = (value: string) => {
  try {
    return new URL(value).origin === value;
  } catch {
    return false;
  }
};

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"], {
    error: "Debe ser development, test o production.",
  }),
  PORT: z.coerce
    .number({ error: "Debe ser un número de puerto." })
    .int()
    .min(1)
    .max(65_535),
  CORS_ORIGIN: z
    .string({ error: "Es obligatoria." })
    .transform((value) => value.split(",").map((origin) => origin.trim()).filter(Boolean))
    .refine((origins) => origins.length > 0 && origins.every(isOrigin), {
      error: "Usa uno o varios orígenes separados por comas (p. ej. http://127.0.0.1:3000), sin ruta ni barra final.",
    }),
  DATABASE_URL: z
    .string({ error: "Es obligatoria." })
    .regex(/^mysql:\/\/.+/, { error: "Debe ser una URL mysql://." }),
  // Vacía o ausente: se decide según NODE_ENV.
  COOKIE_SECURE: z.preprocess(
    (value) => (value === "" ? undefined : value),
    z
      .enum(["true", "false"], { error: "Debe ser true o false." })
      .transform((value) => value === "true")
      .optional(),
  ),
});

// Falla al arrancar con todos los problemas juntos, en lugar de a mitad de una petición.
export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const result = schema.safeParse(env);
  if (!result.success) {
    const problems = result.error.issues.map(
      (issue) => `  - ${issue.path.join(".")}: ${issue.message}`,
    );
    throw new Error(`Configuración inválida (revisa .env):\n${problems.join("\n")}`);
  }
  const { NODE_ENV, PORT, CORS_ORIGIN, DATABASE_URL, COOKIE_SECURE } = result.data;
  return {
    nodeEnv: NODE_ENV,
    port: PORT,
    corsOrigins: CORS_ORIGIN,
    databaseUrl: DATABASE_URL,
    cookieSecure: COOKIE_SECURE ?? NODE_ENV !== "development",
  };
}
