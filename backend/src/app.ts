import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import type { UseCases } from "./business/use-cases/index.js";
import { errorHandler, notFound, type Logger } from "./presentation/middleware/error.middleware.js";
import { originGuard } from "./presentation/middleware/origin.middleware.js";
import { createSessionCookies } from "./presentation/middleware/session.middleware.js";
import { createRouter } from "./presentation/routes/index.js";

export interface AppOptions {
  useCases: UseCases;
  corsOrigins: readonly string[];
  cookieSecure: boolean;
  logger?: Logger;
}

// Recibe los casos de uso ya construidos: en producción los arma container.ts y en los tests, los fakes.
export function createApp({ useCases, corsOrigins, cookieSecure, logger = console }: AppOptions) {
  const app = express();
  app.disable("x-powered-by");
  app.use(cors({ origin: [...corsOrigins], credentials: true }));
  app.use(originGuard(corsOrigins));
  app.use(cookieParser());
  app.use(express.json({ limit: "100kb" }));
  app.use(
    "/api",
    createRouter({ useCases, cookies: createSessionCookies({ secure: cookieSecure }) }),
  );
  app.use(notFound);
  app.use(errorHandler(logger));
  return app;
}
