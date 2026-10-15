"use client";
export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset(): void;
}) {
  return (
    <main className="grid min-h-screen place-content-center gap-4 p-8">
      <h1>No se pudo mostrar esta página</h1>
      <p className="text-muted">
        Tus cambios podrían haberse completado. Recarga antes de repetir una
        acción.
      </p>
      <button className="button button-secondary" onClick={reset}>
        Volver a intentar
      </button>
    </main>
  );
}
