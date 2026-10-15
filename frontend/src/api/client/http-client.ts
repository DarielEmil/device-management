import axios from "axios";
import { DomainError } from "@/business/entities/models";

interface ErrorBody {
  message?: string;
  fields?: Record<string, string>;
}
function readError(body: unknown): ErrorBody {
  if (!body || typeof body !== "object") return {};
  const result: ErrorBody = {};
  if ("message" in body && typeof body.message === "string")
    result.message = body.message;
  if (
    "fields" in body &&
    typeof body.fields === "object" &&
    body.fields !== null
  ) {
    result.fields = Object.fromEntries(
      Object.entries(body.fields).filter(
        (entry): entry is [string, string] => typeof entry[1] === "string",
      ),
    );
  }
  return result;
}

export function createHttpClient(baseUrl: string | undefined) {
  const client = axios.create({
    baseURL: baseUrl?.replace(/\/+$/, ""),
    timeout: 15_000,
    withCredentials: true,
    headers: { Accept: "application/json" },
  });

  return async (
    path: string,
    options: { method?: "GET" | "POST"; body?: unknown } = {},
  ): Promise<unknown> => {
    if (!baseUrl)
      throw new DomainError(
        "Configura NEXT_PUBLIC_API_BASE_URL para conectar con la API.",
        {},
        "CONFIGURATION",
      );
    try {
      const response = await client.request<unknown>({
        url: path,
        method: options.method ?? "GET",
        ...(options.body !== undefined ? { data: options.body } : {}),
      });
      if (response.status === 204) return null;
      return response.data;
    } catch (error) {
      if (error instanceof DomainError) throw error;
      if (axios.isAxiosError<unknown>(error) && error.response) {
        const body = readError(error.response.data);
        throw new DomainError(
          body.message ?? "No se pudo completar la solicitud.",
          body.fields,
          error.response.status === 401 ? "UNAUTHENTICATED" : "HTTP_ERROR",
        );
      }
      throw new DomainError(
        "No se pudo conectar con la API. Revisa tu conexión e inténtalo de nuevo.",
        {},
        "NETWORK",
      );
    }
  };
}
