import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { AuthError, ConflictError, NotFoundError } from "../../utils/errors.js";
import { authConfig, env } from "../../config/env.js";
import { sendPasswordResetEmail, sendVerificationEmail } from "../../lib/mailer.js";
import { logger } from "../../lib/logger.js";

const parseDurationMs = (value: string) => {
  const match = value.trim().match(/^(\d+)(ms|s|m|h|d)?$/i);
  if (!match) return 0;
  const amount = Number(match[1]);
  const unit = (match[2] || "ms").toLowerCase();
  switch (unit) {
    case "ms":
      return amount;
    case "s":
      return amount * 1000;
    case "m":
      return amount * 60 * 1000;
    case "h":
      return amount * 60 * 60 * 1000;
    case "d":
      return amount * 24 * 60 * 60 * 1000;
    default:
      return amount;
  }
};

const issueAccessToken = (user: { id: string; email: string; role: string }) => {
  const options: jwt.SignOptions = {
    expiresIn: authConfig.accessTtl as unknown as jwt.SignOptions["expiresIn"]
  };
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    env.JWT_SECRET as jwt.Secret,
    options
  );
};

const issueRefreshToken = (userId: string) => {
  const jti = crypto.randomUUID();
  const options: jwt.SignOptions = {
    expiresIn: authConfig.refreshTtl as unknown as jwt.SignOptions["expiresIn"]
  };
  return jwt.sign({ sub: userId, typ: "refresh", jti }, env.JWT_REFRESH_SECRET as jwt.Secret, options);
};

const createRefreshTokenRecord = async (userId: string) => {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const refreshToken = issueRefreshToken(userId);
    try {
      await prisma.refreshToken.create({
        data: {
          userId,
          token: refreshToken,
          expiresAt: refreshExpiresAt()
        }
      });
      return refreshToken;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        continue;
      }
      throw error;
    }
  }
  throw new AuthError("Failed to issue refresh token");
};

const refreshExpiresAt = () => {
  const ttlMs = parseDurationMs(authConfig.refreshTtl);
  return new Date(Date.now() + (ttlMs || 7 * 24 * 60 * 60 * 1000));
};

const createEmailVerificationTokenRecord = async (userId: string) => {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await prisma.$transaction([
    prisma.emailVerificationToken.updateMany({
      where: { userId, usedAt: null },
      data: { usedAt: new Date() }
    }),
    prisma.emailVerificationToken.create({ data: { userId, token, expiresAt } })
  ]);
  return { token, expiresAt };
};

export const registerUser = async (payload: { email: string; password: string; name?: string }) => {
  const existing = await prisma.user.findUnique({ where: { email: payload.email } });
  if (existing) throw new ConflictError("Email already in use");

  const passwordHash = await bcrypt.hash(payload.password, authConfig.bcryptRounds);
  const user = await prisma.user.create({
    data: {
      email: payload.email,
      passwordHash,
      name: payload.name ?? null,
      profile: {
        create: {
          displayName: payload.name ?? payload.email
        }
      }
    }
  });

  const accessToken = issueAccessToken({ id: user.id, email: user.email, role: user.role });
  const refreshToken = await createRefreshTokenRecord(user.id);

  // 注册成功后自动发送验证邮件；发信失败不应阻断注册流程，仅记录日志。
  // 验证邮箱只是给账号打上 emailVerifiedAt 标记，不影响注册/登录本身。
  try {
    const { token } = await createEmailVerificationTokenRecord(user.id);
    await sendVerificationEmail(user.email, token);
  } catch (error) {
    logger.error({ err: error, userId: user.id }, "Failed to send verification email on register");
  }

  return {
    user: { id: user.id, email: user.email, name: user.name, role: user.role, emailVerifiedAt: user.emailVerifiedAt },
    tokens: { accessToken, refreshToken }
  };
};

export const loginUser = async (email: string, password: string) => {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new AuthError("Invalid email or password");

  const isValid = await bcrypt.compare(password, user.passwordHash);
  if (!isValid) throw new AuthError("Invalid email or password");

  const accessToken = issueAccessToken({ id: user.id, email: user.email, role: user.role });
  const refreshToken = await createRefreshTokenRecord(user.id);

  return {
    user: { id: user.id, email: user.email, name: user.name, role: user.role, emailVerifiedAt: user.emailVerifiedAt },
    tokens: { accessToken, refreshToken }
  };
};

export const refreshSession = async (token: string) => {
  let payload: jwt.JwtPayload;
  try {
    payload = jwt.verify(token, env.JWT_REFRESH_SECRET) as jwt.JwtPayload;
  } catch {
    throw new AuthError("Invalid refresh token");
  }

  const stored = await prisma.refreshToken.findUnique({ where: { token } });
  if (!stored || stored.revokedAt) throw new AuthError("Refresh token revoked");
  if (stored.expiresAt <= new Date()) throw new AuthError("Refresh token expired");

  const userId = payload.sub as string | undefined;
  if (!userId) throw new AuthError("Invalid refresh token");
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AuthError("Invalid refresh token");

  await prisma.refreshToken.update({
    where: { token },
    data: { revokedAt: new Date() }
  });

  const accessToken = issueAccessToken({ id: user.id, email: user.email, role: user.role });
  const newRefreshToken = await createRefreshTokenRecord(user.id);

  return { tokens: { accessToken, refreshToken: newRefreshToken } };
};

export const logoutSession = async (token: string) => {
  await prisma.refreshToken.updateMany({
    where: { token },
    data: { revokedAt: new Date() }
  });
};

export const getCurrentUser = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true, role: true, emailVerifiedAt: true }
  });
  if (!user) throw new NotFoundError("User not found");
  return user;
};

export const requestEmailVerification = async (email: string) => {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new NotFoundError("User not found");

  const { token, expiresAt } = await createEmailVerificationTokenRecord(user.id);
  await sendVerificationEmail(user.email, token);

  // 生产环境不回传原始 token，避免绕过邮件直接拿到验证凭证；开发环境保留方便本地联调。
  return env.NODE_ENV === "production" ? { expiresAt } : { token, expiresAt };
};

export const verifyEmailToken = async (token: string) => {
  const record = await prisma.emailVerificationToken.findUnique({ where: { token } });
  if (!record || record.usedAt) throw new AuthError("Invalid or used token");
  if (record.expiresAt <= new Date()) throw new AuthError("Token expired");

  await prisma.$transaction(async (tx) => {
    const consumed = await tx.emailVerificationToken.updateMany({
      where: { id: record.id, usedAt: null, expiresAt: { gt: new Date() } },
      data: { usedAt: new Date() }
    });
    if (consumed.count !== 1) throw new AuthError("Invalid, used, or expired token");

    await tx.user.update({
      where: { id: record.userId },
      data: { emailVerifiedAt: new Date() }
    });
  });
};

export const requestPasswordReset = async (email: string) => {
  const user = await prisma.user.findUnique({ where: { email } });
  // Keep the public response indistinguishable to prevent account enumeration.
  if (!user) return {};

  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

  await prisma.$transaction([
    prisma.passwordResetToken.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: new Date() }
    }),
    prisma.passwordResetToken.create({
      data: { userId: user.id, token, expiresAt }
    })
  ]);

  await sendPasswordResetEmail(user.email, token);

  return env.NODE_ENV === "production" ? {} : { token, expiresAt };
};

export const resetPassword = async (token: string, password: string) => {
  const record = await prisma.passwordResetToken.findUnique({ where: { token } });
  if (!record || record.usedAt) throw new AuthError("Invalid or used token");
  if (record.expiresAt <= new Date()) throw new AuthError("Token expired");

  const passwordHash = await bcrypt.hash(password, authConfig.bcryptRounds);

  await prisma.$transaction(async (tx) => {
    const consumed = await tx.passwordResetToken.updateMany({
      where: { id: record.id, usedAt: null, expiresAt: { gt: new Date() } },
      data: { usedAt: new Date() }
    });
    if (consumed.count !== 1) throw new AuthError("Invalid, used, or expired token");

    await tx.passwordResetToken.updateMany({
      where: { userId: record.userId, usedAt: null },
      data: { usedAt: new Date() }
    });
    await tx.refreshToken.updateMany({
      where: { userId: record.userId, revokedAt: null },
      data: { revokedAt: new Date() }
    });
    await tx.user.update({
      where: { id: record.userId },
      data: { passwordHash }
    });
  });
};

export const updateUserProfile = async (
  userId: string,
  data: { name?: string; phone?: string; university?: string; avatarUrl?: string }
) => {
  const updateData: Prisma.UserUpdateInput = {};

  if (data.name !== undefined) updateData.name = data.name;
  if (data.phone !== undefined || data.university !== undefined || data.avatarUrl !== undefined) {
    updateData.profile = {
      upsert: {
        create: {
          displayName: data.name ?? "",
          phone: data.phone ?? null,
          university: data.university ?? null,
          avatarUrl: data.avatarUrl ?? null
        },
        update: {
          ...(data.phone !== undefined ? { phone: data.phone } : {}),
          ...(data.university !== undefined ? { university: data.university } : {}),
          ...(data.avatarUrl !== undefined ? { avatarUrl: data.avatarUrl } : {})
        }
      }
    };
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: updateData,
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      emailVerifiedAt: true,
      profile: {
        select: {
          phone: true,
          university: true,
          avatarUrl: true
        }
      },
      createdAt: true,
      updatedAt: true
    }
  });

  return user;
};
