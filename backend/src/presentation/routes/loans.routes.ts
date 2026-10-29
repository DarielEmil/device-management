import { Router, type RequestHandler } from "express";
import type { LoanUseCases } from "../../business/use-cases/loans.use-case.js";
import { createLoansController } from "../controllers/loans.controller.js";

export function createLoansRouter(loans: LoanUseCases, session: RequestHandler): Router {
  const controller = createLoansController(loans);
  const router = Router();
  router.use(session);
  router.get("/", controller.list);
  router.post("/", controller.create);
  router.post("/:id/return", controller.returnLoan);
  return router;
}
