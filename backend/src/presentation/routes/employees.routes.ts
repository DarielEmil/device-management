import { Router, type RequestHandler } from "express";
import type { EmployeeUseCases } from "../../business/use-cases/employees.use-case.js";
import { createEmployeesController } from "../controllers/employees.controller.js";

export function createEmployeesRouter(employees: EmployeeUseCases, session: RequestHandler): Router {
  const controller = createEmployeesController(employees);
  const router = Router();
  router.use(session);
  router.get("/", controller.list);
  router.post("/", controller.create);
  return router;
}
