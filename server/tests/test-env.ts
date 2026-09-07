/**
 * Shared configuration for the integration test suite.
 *
 * Tests run against a REAL PostgreSQL database (schema applied with
 * `prisma migrate deploy`) and drive the COMPILED server from `dist/server`,
 * i.e. exactly the artifact that runs in production.
 */
const DEFAULT_USER = process.env.USER || "postgres";

export const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  `postgresql://${DEFAULT_USER}@localhost:5432/circulink_test`;

export const TEST_ENV: Record<string, string> = {
  NODE_ENV: "test",
  DATABASE_URL: TEST_DATABASE_URL,
  JWT_SECRET: "test-access-secret",
  JWT_REFRESH_SECRET: "test-refresh-secret",
  JWT_ACCESS_TTL: "15m",
  JWT_REFRESH_TTL: "7d",
  BCRYPT_ROUNDS: "4", // keep hashing cheap in tests
  UPLOAD_DIR: "uploads",
  // Registration is open by default; the allowlist has its own dedicated test.
  ALLOWED_EMAIL_DOMAINS: "",
  // Keep test output readable — the server logs every request at info level.
  LOG_LEVEL: "silent",
  // Tests exercise the reset/verify flows end to end, so they opt in explicitly
  // to receiving the raw tokens (production must never set this).
  EXPOSE_DEV_TOKENS: "true",
  // The suite performs hundreds of auth writes from one loopback address; the
  // IP-keyed limiter would otherwise make results depend on how recently the
  // suite last ran.
  DISABLE_RATE_LIMIT: "true",
};

export const applyTestEnv = () => {
  for (const [key, value] of Object.entries(TEST_ENV)) {
    process.env[key] = value;
  }
};
