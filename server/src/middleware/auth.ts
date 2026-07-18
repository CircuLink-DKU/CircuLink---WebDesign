import jwt from "jsonwebtoken";
import { RequestHandler } from "express";
import { AuthError, ForbiddenError } from "../utils/errors.js";
import { env } from "../config/env.js";

export type AuthUser = {
  id: string;
  email?: string;
  role?: UserRole | string;
};

export const USER_ROLES = ["USER", "ADMIN", "CLUB_OPERATOR", "BUY42_PARTNER"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const authenticate: RequestHandler = (req, _res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return next();
  }
  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as AuthUser;
    req.user = payload;
  } catch {
    return next(new AuthError("Invalid token"));
  }
  return next();
};

export const requireAuth: RequestHandler = (req, _res, next) => {
  if (!req.user) {
    const header = req.headers.authorization;
    if (header?.startsWith("Bearer ")) {
      const token = header.slice(7);
      try {
        const payload = jwt.verify(token, env.JWT_SECRET) as AuthUser;
        req.user = payload;
      } catch {
        return next(new AuthError("Invalid token"));
      }
    }
  }
  if (!req.user) return next(new AuthError());
  return next();
};

export const requireAdmin: RequestHandler = (req, _res, next) => {
  if (!req.user) return next(new AuthError());
  if (!hasRole(req.user, "ADMIN")) return next(new ForbiddenError("Admin access required"));
  return next();
};

export const hasRole = (user: AuthUser | undefined, ...roles: UserRole[]) => {
  if (!user?.role) return false;
  return roles.includes(user.role as UserRole);
};

export const requireRole =
  (...roles: UserRole[]): RequestHandler =>
  (req, _res, next) => {
    if (!req.user) return next(new AuthError());
    if (!hasRole(req.user, ...roles)) {
      return next(new ForbiddenError(`${roles.join(" or ")} access required`));
    }
    return next();
  };

export const requireClubOperator = requireRole("CLUB_OPERATOR");
export const requireBuy42Partner = requireRole("BUY42_PARTNER");
export const requireAdminOrClubOperator = requireRole("ADMIN", "CLUB_OPERATOR");
