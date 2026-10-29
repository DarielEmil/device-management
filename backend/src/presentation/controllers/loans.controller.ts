import type { Request, Response } from "express";
import type { LoanUseCases } from "../../business/use-cases/loans.use-case.js";
import { loanInputDto, loanQueryDto, parseBody, parseQuery, routeParam } from "../dto/input.dto.js";
import { toLoanDto } from "../dto/output.dto.js";
import { actorOf } from "../middleware/session.middleware.js";

export function createLoansController(loans: LoanUseCases) {
  return {
    // CU-06
    async list(req: Request, res: Response) {
      const { status, employeeId } = parseQuery(loanQueryDto, req.query);
      const items = await loans.listLoans(actorOf(res), { status, employeeId });
      res.json({ data: items.map(toLoanDto) });
    },

    // CU-03
    async create(req: Request, res: Response) {
      const body = parseBody(loanInputDto, req.body);
      const created = await loans.createLoan(actorOf(res), {
        employeeId: body.employeeId ?? "",
        equipmentId: body.equipmentId ?? "",
        dueOn: body.dueOn ?? "",
      });
      res.status(201).json({ data: toLoanDto(created) });
    },

    // CU-04
    async returnLoan(req: Request, res: Response) {
      const returned = await loans.returnLoan(actorOf(res), routeParam(req.params, "id"));
      res.json({ data: toLoanDto(returned) });
    },
  };
}
