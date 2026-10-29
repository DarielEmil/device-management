import "dotenv/config";

// TEST_DATABASE_URL, o DATABASE_URL apuntando a <base>_test (la crea database/init/).
export function testDatabaseUrl(): string {
  if (process.env.TEST_DATABASE_URL) return process.env.TEST_DATABASE_URL;
  if (!process.env.DATABASE_URL) throw new Error("Falta DATABASE_URL o TEST_DATABASE_URL.");
  const url = new URL(process.env.DATABASE_URL);
  url.pathname = `${url.pathname}_test`;
  return url.toString();
}
