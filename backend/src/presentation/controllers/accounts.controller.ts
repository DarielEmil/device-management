import type { Request, Response } from "express";
import type { AccountUseCases } from "../../business/use-cases/accounts.use-case.js";
import { invitationInputDto, linkEmployeeInputDto, parseBody, routeParam } from "../dto/input.dto.js";
import { toAccountDto } from "../dto/output.dto.js";
import { actorOf } from "../middleware/session.middleware.js";

export function createAccountsController(accounts: AccountUseCases) {
  return {
    async list(_req: Request, res: Response) {
      const items = await accounts.listAccounts(actorOf(res));
      res.json({ data: items.map(toAccountDto) });
    },

    async invite(req: Request, res: Response) {
      const body = parseBody(invitationInputDto, req.body);
      const invited = await accounts.inviteAccount(actorOf(res), {
        email: body.email ?? "",
        role: body.role ?? "",
        employeeId: body.employeeId ?? undefined,
      });
      res.status(201).json({ data: toAccountDto(invited) });
    },

    async linkEmployee(req: Request, res: Response) {
      const body = parseBody(linkEmployeeInputDto, req.body);
      const account = await accounts.linkEmployee(actorOf(res), routeParam(req.params, "id"), {
        employeeId: body.employeeId ?? "",
      });
      res.json({ data: toAccountDto(account) });
    },

    async deactivate(req: Request, res: Response) {
      const account = await accounts.deactivateAccount(actorOf(res), routeParam(req.params, "id"));
      res.json({ data: toAccountDto(account) });
    },
  };
}
