import type { Request, Response } from "express";
import type { EmployeeUseCases } from "../../business/use-cases/employees.use-case.js";
import { employeeInputDto, parseBody } from "../dto/input.dto.js";
import { toEmployeeDto } from "../dto/output.dto.js";
import { actorOf } from "../middleware/session.middleware.js";

export function createEmployeesController(employees: EmployeeUseCases) {
  return {
    async list(_req: Request, res: Response) {
      const items = await employees.listEmployees(actorOf(res));
      res.json({ data: items.map(toEmployeeDto) });
    },

    // CU-02
    async create(req: Request, res: Response) {
      const body = parseBody(employeeInputDto, req.body);
      const created = await employees.registerEmployee(actorOf(res), {
        firstName: body.firstName ?? "",
        lastName: body.lastName ?? "",
        identity: body.identity ?? "",
        department: body.department ?? "",
        phone: body.phone,
      });
      res.status(201).json({ data: toEmployeeDto(created) });
    },
  };
}
