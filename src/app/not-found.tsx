import Link from "next/link";
export default function NotFound() {
  return (
    <main className="grid min-h-screen place-content-center gap-4 p-8">
      <p className="code text-muted">404</p>
      <h1>No encontramos esta página</h1>
      <p className="text-muted">Revisa la dirección o vuelve al inicio.</p>
      <Link className="link" href="/dashboard">
        Volver al dashboard →
      </Link>
    </main>
  );
}
