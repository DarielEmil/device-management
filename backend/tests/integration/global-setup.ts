import { execFileSync } from "node:child_process";
import { testDatabaseUrl } from "./test-database.js";

export default function setup() {
  execFileSync("npx", ["prisma", "migrate", "deploy"], {
    env: { ...process.env, DATABASE_URL: testDatabaseUrl() },
    stdio: "inherit",
  });
}
