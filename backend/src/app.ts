import cors from "cors";
import express from "express";
import { errorHandler } from "./presentation/middleware/error-handler.js";
import { createRouter, type UseCases } from "./presentation/routes/index.js";

export function createApp(useCases: UseCases, corsOrigin: string) {
  const app = express();
  app.use(cors({ origin: corsOrigin, credentials: true }));
  app.use(express.json());
  app.use("/api", createRouter(useCases));
  app.use((_req, res) => {
    res.status(404).json({
      error: { code: "NOT_FOUND", message: "Ruta no encontrada.", fields: {} },
    });
  });
  app.use(errorHandler);
  return app;
}
