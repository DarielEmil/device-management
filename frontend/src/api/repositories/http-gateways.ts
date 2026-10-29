import type { Gateways } from "@/business/ports/gateways";
import { DomainError } from "@/business/entities/models";
import { createHttpClient } from "../client/http-client";
import {
  accountDto,
  accountListDto,
  employeeDto,
  employeeListDto,
  equipmentDto,
  equipmentListDto,
  loanDto,
  loanListDto,
  sessionDto,
} from "../dto/contracts";
import { decode } from "../mappers/decode";

export function createHttpGateways(baseUrl: string | undefined): Gateways {
  const request = createHttpClient(baseUrl);
  const authenticate = async (path: string, body: unknown) => {
    const session = decode(
      sessionDto,
      await request(path, { method: "POST", body }),
    ).data;
    if (!session)
      throw new DomainError(
        "La API no devolvió una sesión válida.",
        {},
        "INVALID_RESPONSE",
      );
    return session;
  };
  return {
    auth: {
      async current() {
        try {
          return decode(sessionDto, await request("/auth/session")).data;
        } catch (error) {
          if (error instanceof DomainError && error.code === "UNAUTHENTICATED")
            return null;
          throw error;
        }
      },
      login: (body) => authenticate("/auth/login", body),
      register: (body) => authenticate("/auth/register", body),
      async logout() {
        await request("/auth/logout", { method: "POST" });
      },
      async recover(email) {
        await request("/auth/recover", { method: "POST", body: { email } });
      },
    },
    equipment: {
      async list() {
        return decode(equipmentListDto, await request("/equipment")).data;
      },
      async create(body) {
        return decode(
          equipmentDto,
          await request("/equipment", { method: "POST", body }),
        ).data;
      },
    },
    employees: {
      async list() {
        return decode(employeeListDto, await request("/employees")).data;
      },
      async create(body) {
        return decode(
          employeeDto,
          await request("/employees", { method: "POST", body }),
        ).data;
      },
    },
    loans: {
      async list() {
        return decode(loanListDto, await request("/loans")).data;
      },
      async create(body) {
        return decode(
          loanDto,
          await request("/loans", { method: "POST", body }),
        ).data;
      },
      async returnLoan(id) {
        return decode(
          loanDto,
          await request(`/loans/${encodeURIComponent(id)}/return`, {
            method: "POST",
          }),
        ).data;
      },
    },
    accounts: {
      async list() {
        return decode(accountListDto, await request("/accounts")).data;
      },
      async invite(body) {
        return decode(
          accountDto,
          await request("/invitations", { method: "POST", body }),
        ).data;
      },
      async linkEmployee(id, employeeId) {
        return decode(
          accountDto,
          await request(`/accounts/${encodeURIComponent(id)}/link-employee`, {
            method: "POST",
            body: { employeeId },
          }),
        ).data;
      },
      async deactivate(id) {
        return decode(
          accountDto,
          await request(`/accounts/${encodeURIComponent(id)}/deactivate`, {
            method: "POST",
          }),
        ).data;
      },
    },
  };
}
