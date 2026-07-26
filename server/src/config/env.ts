import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { z } from "zod";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envCandidates = [
  path.resolve(process.cwd(), "server/.env"),
  path.resolve(process.cwd(), ".env"),
  path.resolve(__dirname, "../../.env"),
  path.resolve(__dirname, "../../../server/.env"),
  path.resolve(__dirname, "../../../.env")
];

const uniqueEnvCandidates = Array.from(new Set(envCandidates));
const resolvedEnvPaths = uniqueEnvCandidates.filter((candidate) => fs.existsSync(candidate));

if (resolvedEnvPaths.length > 0) {
  // Load from most specific to most general; keep existing values when duplicated.
  for (const envPath of resolvedEnvPaths) {
    dotenv.config({ path: envPath, override: false });
  }
} else {
  dotenv.config();
}

const envSchema = z.object({
  NODE_ENV: z.string().default("development"),
  PORT: z.string().default("4000"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  JWT_SECRET: z.string().min(1, "JWT_SECRET is required"),
  JWT_REFRESH_SECRET: z.string().min(1, "JWT_REFRESH_SECRET is required"),
  JWT_ACCESS_TTL: z.string().default("15m"),
  JWT_REFRESH_TTL: z.string().default("7d"),
  BCRYPT_ROUNDS: z.string().default("10"),
  CORS_ORIGIN: z.string().optional(),
  UPLOAD_DIR: z.string().default("uploads"),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_BASE_URL: z.string().default("https://api.openai.com/v1"),
  OPENAI_MODEL: z.string().default("gpt-4.1-mini"),
  // 阿里云邮件推送（DirectMail）SMTP 配置，见 server/src/lib/mailer.ts 顶部注释
  DM_SMTP_HOST: z.string().optional(),
  DM_SMTP_PORT: z.string().default("465"),
  DM_SMTP_USER: z.string().optional(),
  DM_SMTP_PASS: z.string().optional(),
  MAIL_FROM_NAME: z.string().default("Circulink"),
  APP_BASE_URL: z.string().default("http://localhost:5173")
});

const parsedEnv = envSchema.parse({
  ...process.env,
  // Backward compatibility for old server/.env templates.
  JWT_SECRET: process.env.JWT_SECRET ?? process.env.JWT_ACCESS_SECRET
});
export const env = {
  ...parsedEnv,
  OPENAI_API_KEY: parsedEnv.OPENAI_API_KEY?.trim(),
  OPENAI_BASE_URL: parsedEnv.OPENAI_BASE_URL.trim(),
  OPENAI_MODEL: parsedEnv.OPENAI_MODEL.trim()
};

export const serverConfig = {
  port: parseInt(env.PORT, 10) || 4000,
  corsOrigins: env.CORS_ORIGIN?.split(",").map((origin) => origin.trim()).filter(Boolean) ?? ["*"],
  uploadDir: env.UPLOAD_DIR
};

export const authConfig = {
  accessTtl: env.JWT_ACCESS_TTL,
  refreshTtl: env.JWT_REFRESH_TTL,
  bcryptRounds: parseInt(env.BCRYPT_ROUNDS, 10) || 10
};

export const mailConfig = {
  host: env.DM_SMTP_HOST?.trim(),
  port: parseInt(env.DM_SMTP_PORT, 10) || 465,
  user: env.DM_SMTP_USER?.trim(),
  pass: env.DM_SMTP_PASS,
  fromName: env.MAIL_FROM_NAME,
  appBaseUrl: env.APP_BASE_URL.replace(/\/$/, "")
};
