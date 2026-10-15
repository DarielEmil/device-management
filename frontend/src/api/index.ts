import type { Gateways } from "@/business/ports/gateways";
import {
  apiBaseUrl,
  mockDelay,
  mockMode,
  mockScenario,
  referenceDate,
} from "./config/environment";
import { createHttpGateways } from "./repositories/http-gateways";

export async function createGateways(): Promise<Gateways> {
  // This is the only environment switch. There is deliberately no fallback on HTTP errors.
  if (mockMode) {
    const { createMockGateways } =
      await import("@/mocks/repositories/mock-gateways");
    return createMockGateways({
      delay: mockDelay,
      scenario: mockScenario,
      today: referenceDate,
    });
  }
  return createHttpGateways(apiBaseUrl);
}
