"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import {
  useEffect,
  useState,
  type ComponentProps,
  type ReactNode,
} from "react";
import {
  loginInputSchema,
  registerInputSchema,
} from "@/business/rules/validation";
import { useApplication } from "../context/application-context";
import { useFormModel } from "../hooks/use-form-model";
import { Button, InlineError, Input, Notice } from "../components/primitives";

function PasswordInput(
  props: Omit<ComponentProps<typeof Input>, "label"> & {
    autoComplete?: string;
  },
) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <Input
        {...props}
        label="Contraseña"
        type={visible ? "text" : "password"}
        className="pr-11"
        required
      />
      <button
        type="button"
        className="icon-button absolute right-1 top-[27px]"
        onClick={() => setVisible(!visible)}
        aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
      >
        {visible ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  );
}

function AuthFrame({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  const { session, ready } = useApplication();
  const router = useRouter();
  useEffect(() => {
    if (ready && session) router.replace("/dashboard");
  }, [ready, session, router]);
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-panel px-4 py-12">
      <div className="w-full max-w-[400px] rounded-lg border border-border bg-white p-8">
        <Link
          href="/login"
          className="mb-8 block text-base font-semibold tracking-tight"
        >
          Device Management
        </Link>
        <h1 className="text-xl leading-7">{title}</h1>
        <p className="mb-6 mt-2 text-muted">{subtitle}</p>
        {children}
      </div>
      <p className="mt-6 text-xs text-muted">
        Gestión interna de equipos y préstamos
      </p>
    </main>
  );
}

export function LoginScreen() {
  const { login, mockMode, loadError } = useApplication();
  const router = useRouter();
  const form = useFormModel(
    loginInputSchema,
    { email: "", password: "" },
    async (input) => {
      await login(input);
      router.replace("/dashboard");
    },
  );
  function fill(email: string) {
    form.set("email", email);
    form.set("password", "Demo2026!");
  }
  return (
    <AuthFrame
      title="Iniciar sesión"
      subtitle="Accede con tu cuenta corporativa"
    >
      <form onSubmit={form.onSubmit} noValidate className="space-y-4">
        <Input
          label="Correo electrónico"
          placeholder="nombre@empresa.com"
          autoComplete="username"
          type="email"
          required
          {...form.field("email")}
        />
        <PasswordInput
          autoComplete="current-password"
          {...form.field("password")}
        />
        <div className="text-right">
          <Link className="link text-xs" href="/forgot-password">
            ¿Olvidaste tu contraseña?
          </Link>
        </div>
        <InlineError>{form.errors.form || loadError}</InlineError>
        <Button
          type="submit"
          className="w-full"
          disabled={form.busy || !form.valid}
        >
          {form.busy ? "Iniciando sesión…" : "Iniciar sesión"}
        </Button>
      </form>
      <p className="mt-6 text-center text-[13px] text-muted">
        ¿No tienes cuenta?{" "}
        <Link className="link" href="/register">
          Crear cuenta
        </Link>
      </p>
      {mockMode && (
        <div className="mt-6 border-t border-border pt-5">
          <p className="mb-1 text-xs font-medium">Cuentas de demostración</p>
          <p className="text-xs text-muted">
            Completa los campos y pulsa Iniciar sesión.
          </p>
          <div className="mt-3 flex gap-2">
            <Button
              className="flex-1 text-xs"
              variant="secondary"
              onClick={() => fill("laura.mendez@empresa.com")}
            >
              Laura · Encargado
            </Button>
            <Button
              className="flex-1 text-xs"
              variant="secondary"
              onClick={() => fill("ana.garcia@empresa.com")}
            >
              Ana · Empleado
            </Button>
          </div>
        </div>
      )}
    </AuthFrame>
  );
}

export function RegisterScreen() {
  const { register } = useApplication();
  const router = useRouter();
  const form = useFormModel(
    registerInputSchema,
    { name: "", email: "", password: "" },
    async (input) => {
      await register(input);
      router.replace("/dashboard");
    },
  );
  return (
    <AuthFrame
      title="Crear cuenta"
      subtitle="Regístrate con tu correo corporativo"
    >
      <form onSubmit={form.onSubmit} noValidate className="space-y-4">
        <Input
          label="Nombre completo"
          autoComplete="name"
          required
          {...form.field("name")}
        />
        <Input
          label="Correo electrónico"
          type="email"
          autoComplete="email"
          required
          placeholder="nombre@empresa.com"
          {...form.field("email")}
        />
        <PasswordInput
          autoComplete="new-password"
          hint="Usa al menos 8 caracteres."
          {...form.field("password")}
        />
        <p className="text-xs text-muted">
          Tu cuenta tendrá acceso de Empleado. Para recibir equipos, contacta al
          encargado y solicita tu registro de empleado.
        </p>
        <InlineError>{form.errors.form}</InlineError>
        <Button
          type="submit"
          className="w-full"
          disabled={form.busy || !form.valid}
        >
          {form.busy ? "Creando cuenta…" : "Crear cuenta"}
        </Button>
      </form>
      <p className="mt-6 text-center text-[13px] text-muted">
        ¿Ya tienes cuenta?{" "}
        <Link className="link" href="/login">
          Iniciar sesión
        </Link>
      </p>
    </AuthFrame>
  );
}

export function RecoverScreen() {
  const { application, mockMode } = useApplication();
  const [sent, setSent] = useState(false);
  const schema = loginInputSchema.pick({ email: true });
  const form = useFormModel(schema, { email: "" }, async ({ email }) => {
    await application.recover(email);
    setSent(true);
  });
  return (
    <AuthFrame
      title="Recuperar contraseña"
      subtitle="Te ayudamos a recuperar el acceso a tu cuenta"
    >
      {sent ? (
        <Notice>
          {mockMode
            ? "Simulación completada. No se ha enviado ningún correo real."
            : "Si el correo está registrado, recibirás las instrucciones para recuperar tu cuenta."}
        </Notice>
      ) : (
        <form onSubmit={form.onSubmit} noValidate className="space-y-4">
          <Input
            label="Correo electrónico"
            type="email"
            autoComplete="email"
            required
            {...form.field("email")}
          />
          <InlineError>{form.errors.form}</InlineError>
          <Button
            type="submit"
            className="w-full"
            disabled={form.busy || !form.valid}
          >
            {form.busy ? "Procesando…" : "Enviar instrucciones"}
          </Button>
        </form>
      )}
      <Link href="/login" className="link mt-6 text-[13px]">
        Volver a iniciar sesión
      </Link>
    </AuthFrame>
  );
}
