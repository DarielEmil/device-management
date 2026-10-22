"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ArrowLeftRight,
  Box,
  LayoutDashboard,
  LogOut,
  Monitor,
  Users,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { Role } from "@/business/entities/models";
import { canAccess } from "@/business/rules/loans";
import { useApplication } from "../context/application-context";
import {
  Button,
  EmptyState,
  InlineError,
  LoadingState,
  Notice,
} from "./primitives";
import { formatDate, initials, roleLabels } from "../format";

export function AppShell({ children }: { children: ReactNode }) {
  const {
    session,
    ready,
    loading,
    loadError,
    notice,
    mockMode,
    application,
    snapshot,
    logout,
    refresh,
  } = useApplication();
  const pathname = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState("");
  const permitted = session ? canAccess(session.account.role, pathname) : false;
  useEffect(() => {
    if (!ready) return;
    if (!session) router.replace("/login");
    else if (!permitted) router.replace("/dashboard");
  }, [ready, session, permitted, router]);
  if (!ready || !session || !permitted)
    return (
      <main className="p-8">
        <LoadingState />
      </main>
    );
  const manager = session.account.role === Role.Manager;
  const navigation = manager
    ? [
        { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
        { href: "/inventory", label: "Inventario", icon: Box },
        { href: "/loans", label: "Préstamos", icon: ArrowLeftRight },
        { href: "/users", label: "Usuarios", icon: Users },
      ]
    : [
        { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
        {
          href: "/available-equipment",
          label: "Equipos disponibles",
          icon: Monitor,
        },
        {
          href: "/my-loans",
          label: "Mis préstamos",
          icon: ArrowLeftRight,
        },
      ];
  const noData = Object.values(snapshot).every((items) => items.length === 0);

  return (
    <div className="min-w-[860px]">
      <a
        href="#contenido"
        className="sr-only fixed left-64 top-2 z-70 rounded-sm bg-white p-3 focus:not-sr-only"
      >
        Saltar al contenido
      </a>
      <aside className="fixed inset-y-0 left-0 z-20 flex w-[232px] flex-col justify-between border-r border-border bg-panel p-4">
        <div>
          <Link
            href="/dashboard"
            className="mb-7 block px-3 py-2 text-base font-semibold tracking-tight"
          >
            Device Management
          </Link>
          <nav aria-label="Navegación principal" className="space-y-1">
            {navigation.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                aria-current={pathname === href ? "page" : undefined}
                className={`flex items-center gap-2.5 rounded-sm px-3 py-2.5 font-medium transition-colors ${pathname === href ? "bg-primary/10 text-primary" : "text-muted hover:bg-slate-100 hover:text-ink"}`}
              >
                <Icon size={20} />
                {label}
              </Link>
            ))}
          </nav>
        </div>
        <div>
          {mockMode && (
            <div className="mb-5 rounded-sm border border-border px-3 py-2.5 text-xs text-muted">
              <p className="font-medium text-ink">Entorno de demostración</p>
              <p className="mt-1">
                Datos en memoria · {formatDate(application.today())}
              </p>
            </div>
          )}
          <div className="border-t border-border pt-4">
            <div className="flex items-center gap-2.5 px-2">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-slate-200 text-xs font-medium text-slate-600">
                {initials(session.account.name)}
              </div>
              <div className="min-w-0">
                <p className="truncate text-[13px] font-medium">
                  {session.account.name}
                </p>
                <p className="text-xs text-muted">{roleLabels[session.account.role]}</p>
              </div>
            </div>
            <button
              className="mt-3 flex w-full items-center gap-2 rounded-sm px-3 py-2 text-[13px] text-muted hover:bg-slate-100 hover:text-ink disabled:opacity-40"
              disabled={loggingOut}
              onClick={async () => {
                setLoggingOut(true);
                setLogoutError("");
                try {
                  await logout();
                  router.replace("/login");
                } catch (error) {
                  setLogoutError(
                    error instanceof Error
                      ? error.message
                      : "No se pudo cerrar sesión.",
                  );
                } finally {
                  setLoggingOut(false);
                }
              }}
            >
              <LogOut size={16} />
              {loggingOut ? "Cerrando sesión…" : "Cerrar sesión"}
            </button>
            <InlineError>{logoutError}</InlineError>
          </div>
        </div>
      </aside>
      <main
        id="contenido"
        tabIndex={-1}
        className="ml-[232px] min-h-screen p-8 outline-none"
      >
        <div className="mx-auto max-w-[1440px]">
          {notice && <Notice>{notice}</Notice>}
          {loadError ? (
            <section className="panel">
              <EmptyState
                title="No se pudieron cargar los datos"
                description={loadError}
                action={
                  <Button
                    variant="secondary"
                    onClick={() => void refresh()}
                    disabled={loading}
                  >
                    {loading ? "Cargando…" : "Volver a intentar"}
                  </Button>
                }
              />
            </section>
          ) : loading && noData ? (
            <LoadingState />
          ) : (
            children
          )}
        </div>
      </main>
    </div>
  );
}
