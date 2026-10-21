import cors from "cors";
import express from "express";
import { createRouter } from "./presentation/routes/index.js";

export function createApp(corsOrigin: string) {
  const app = express();
  app.use(cors({ origin: corsOrigin, credentials: true }));
  app.use(express.json());
  app.use("/api", createRouter());
  return app;
}
