"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  DomainError,
  type Session,
  type Snapshot,
} from "@/business/entities/models";
import type { Application } from "@/business/use-cases/application";
import type { LoginInput, RegisterInput } from "@/business/rules/validation";

interface ApplicationContextValue {
  application: Application;
  mockMode: boolean;
  session: Session | null;
  snapshot: Snapshot;
  ready: boolean;
  loading: boolean;
  loadError: string;
  notice: string;
  login(input: LoginInput): Promise<void>;
  register(input: RegisterInput): Promise<void>;
  logout(): Promise<void>;
  refresh(): Promise<void>;
  notify(message: string): void;
}
const empty: Snapshot = {
  equipment: [],
  employees: [],
  accounts: [],
  loans: [],
};
const ApplicationContext = createContext<ApplicationContextValue | null>(null);

export function ApplicationProvider({
  application,
  mockMode,
  children,
}: {
  application: Application;
  mockMode: boolean;
  children: ReactNode;
}) {
  const [session, setSession] = useState<Session | null>(null);
  const [snapshot, setSnapshot] = useState<Snapshot>(empty);
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [notice, setNotice] = useState("");
  const generation = useRef(0);

  const refresh = useCallback(async () => {
    const request = ++generation.current;
    setLoading(true);
    setLoadError("");
    try {
      const next = await application.load();
      if (request === generation.current) setSnapshot(next);
    } catch (error) {
      if (request !== generation.current) return;
      if (error instanceof DomainError && error.code === "UNAUTHENTICATED") {
        setSession(null);
        setSnapshot(empty);
      } else
        setLoadError(
          error instanceof Error
            ? error.message
            : "No se pudieron cargar los datos.",
        );
    } finally {
      if (request === generation.current) setLoading(false);
    }
  }, [application]);

  useEffect(() => {
    let active = true;
    void application
      .restoreSession()
      .then(async (current) => {
        if (!active) return;
        setSession(current);
        if (current) await refresh();
      })
      .catch((error: unknown) => {
        if (active)
          setLoadError(
            error instanceof Error
              ? error.message
              : "No se pudo recuperar la sesión.",
          );
      })
      .finally(() => {
        if (active) setReady(true);
      });
    return () => {
      active = false;
    };
  }, [application, refresh]);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 6000);
    return () => clearTimeout(timer);
  }, [notice]);

  async function login(input: LoginInput) {
    setSession(await application.login(input));
    await refresh();
  }
  async function register(input: RegisterInput) {
    setSession(await application.register(input));
    await refresh();
  }
  async function logout() {
    await application.logout();
    ++generation.current;
    setSession(null);
    setSnapshot(empty);
    setNotice("");
    setLoadError("");
    setLoading(false);
  }

  return (
    <ApplicationContext.Provider
      value={{
        application,
        mockMode,
        session,
        snapshot,
        ready,
        loading,
        loadError,
        notice,
        login,
        register,
        logout,
        refresh,
        notify: setNotice,
      }}
    >
      {ready ? (
        children
      ) : (
        <div
          className="grid min-h-screen place-content-center text-muted"
          role="status"
        >
          Comprobando sesión…
        </div>
      )}
    </ApplicationContext.Provider>
  );
}

export function useApplication() {
  const context = useContext(ApplicationContext);
  if (!context) throw new Error("ApplicationProvider no está disponible.");
  return context;
}
