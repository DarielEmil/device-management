"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createGateways } from "@/api";
import { mockMode, referenceDate } from "@/api/config/environment";
import {
  createApplication,
  type Application,
} from "@/business/use-cases/application";
import { ApplicationProvider } from "@/ui/context/application-context";

// Composition root: the only place connecting UI, business and API implementations.
let pendingApplication: Promise<Application> | undefined;
function initialize() {
  const fixedDate = referenceDate;
  pendingApplication ??= createGateways().then((gateways) =>
    createApplication(gateways, fixedDate ? () => fixedDate : undefined),
  );
  return pendingApplication;
}

export function Providers({ children }: { children: ReactNode }) {
  const [application, setApplication] = useState<Application>();
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    void initialize()
      .then((value) => {
        if (active) setApplication(value);
      })
      .catch((reason: unknown) => {
        if (active)
          setError(
            reason instanceof Error
              ? reason.message
              : "No se pudo iniciar la aplicación.",
          );
      });
    return () => {
      active = false;
    };
  }, []);
  if (error)
    return (
      <main className="grid min-h-screen place-content-center gap-4 p-8">
        <h1>No se pudo iniciar la aplicación</h1>
        <p className="text-danger">{error}</p>
        <button
          className="button button-secondary"
          onClick={() => {
            pendingApplication = undefined;
            window.location.reload();
          }}
        >
          Volver a intentar
        </button>
      </main>
    );
  if (!application)
    return (
      <div
        role="status"
        className="grid min-h-screen place-content-center text-muted"
      >
        Preparando Device Management…
      </div>
    );
  return (
    <ApplicationProvider application={application} mockMode={mockMode}>
      {children}
    </ApplicationProvider>
  );
}
