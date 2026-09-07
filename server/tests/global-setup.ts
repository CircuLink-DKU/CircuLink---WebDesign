import { execFileSync } from "child_process";
import { TEST_DATABASE_URL } from "./test-env.js";

/**
 * Creates (or resets) the test database and applies migrations once per run.
 * Uses `prisma migrate deploy` — the same command used for production deploys —
 * so a broken migration chain fails the test suite.
 */
const run = (cmd: string, args: string[], env?: Record<string, string>) =>
  execFileSync(cmd, args, {
    stdio: "pipe",
    env: { ...process.env, ...env },
  }).toString();

const dbName = new URL(TEST_DATABASE_URL).pathname.replace(/^\//, "");
const adminUrl = new URL(TEST_DATABASE_URL);
adminUrl.pathname = "/postgres";

export default async function setup() {
  // Recreate the database so every run starts from a known-empty schema.
  const psql = (sql: string) => run("psql", [adminUrl.toString(), "-v", "ON_ERROR_STOP=1", "-c", sql]);

  try {
    psql(`DROP DATABASE IF EXISTS "${dbName}" WITH (FORCE)`);
    psql(`CREATE DATABASE "${dbName}"`);
  } catch (error) {
    throw new Error(
      `Could not prepare the test database at ${TEST_DATABASE_URL}.\n` +
        `Is PostgreSQL running and reachable? Set TEST_DATABASE_URL to override.\n` +
        String(error)
    );
  }

  run("npx", ["prisma", "migrate", "deploy"], { DATABASE_URL: TEST_DATABASE_URL });
}
